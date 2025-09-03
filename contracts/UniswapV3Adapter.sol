// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IUniswap.sol";

/**
 * Uniswap V3 Adapter
 * - Simplifies common DEX operations (add/remove liquidity, swap, quote)
 * - Requires users to approve this adapter to spend their ERC20s, and (for withdraw)
 *   to approve the tokenId to this adapter on the NonfungiblePositionManager.
 *
 * Notes:
 * - tokenA/tokenB can be in any order; contract internally sorts to token0/token1.
 * - addLiquidity mints a new position NFT to the user (msg.sender).
 * - withdrawLiquidity requires msg.sender to be owner or approved for tokenId.
 * - Leftover tokens after mint are refunded to the user.
 */


contract UniswapV3Adapter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISwapRouter public immutable swapRouter;
    INonfungiblePositionManager public immutable positionManager;
    IQuoterV2 public immutable quoter;

    event LiquidityAdded(
        uint256 indexed tokenId,
        address tokenA,
        address tokenB,
        uint24  fee,
        uint256 amountA,
        uint256 amountB,
        int24   tickLower,
        int24   tickUpper
    );
    event LiquidityRemoved(
        uint256 indexed tokenId,
        address tokenA,
        address tokenB,
        uint24  fee,
        uint256 amount0,
        uint256 amount1
    );
    event TokensSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _swapRouter, address _positionManager, address _quoter) {
        require(_swapRouter != address(0) && _positionManager != address(0) && _quoter != address(0), "ZERO_ADDR");
        swapRouter = ISwapRouter(_swapRouter);
        positionManager = INonfungiblePositionManager(_positionManager);
        quoter = IQuoterV2(_quoter);
    }

    /* Helpers */

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_TOKEN");
    }

    function _isApprovedForNFT(uint256 tokenId, address owner) internal view returns (bool) {
        if (positionManager.getApproved(tokenId) == address(this)) return true;
        if (positionManager.isApprovedForAll(owner, address(this))) return true;
        return false;
    }

    /* Add Liquidity */

    /**
     * Mint a new position for (tokenA, tokenB, fee) between [tickLower, tickUpper]
     * Pulls amountA/amountB from user (requires ERC20 approvals).
     * Mints NFT to msg.sender.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint24  fee,
        uint256 amountA,
        uint256 amountB,
        int24   tickLower,
        int24   tickUpper
    ) external nonReentrant returns (uint256 tokenId) {
        require(amountA > 0 || amountB > 0, "NO_AMOUNTS");
        require(tickLower < tickUpper, "BAD_TICKS");

        (address token0, address token1) = _sortTokens(tokenA, tokenB);

        // Pull funds from user to this adapter
        if (amountA > 0) IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        if (amountB > 0) IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // Map desired amounts to token0/token1 order
        (uint256 amount0Desired, uint256 amount1Desired) =
            tokenA == token0 ? (amountA, amountB) : (amountB, amountA);

        // Approve PM to pull funds
        if (amount0Desired > 0) IERC20(token0).safeIncreaseAllowance(address(positionManager), 0);
        if (amount0Desired > 0) IERC20(token0).safeIncreaseAllowance(address(positionManager), amount0Desired);
        if (amount1Desired > 0) IERC20(token1).safeIncreaseAllowance(address(positionManager), 0);
        if (amount1Desired > 0) IERC20(token1).safeIncreaseAllowance(address(positionManager), amount1Desired);

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,     // NFT goes to user     
            deadline: block.timestamp
        });

        uint128 liquidity;
        uint256 used0;
        uint256 used1;
        (tokenId, liquidity, used0, used1) = positionManager.mint(params);
        require(liquidity > 0, "NO_LIQUIDITY");

        // Refund any unused tokens from adapter back to user
        if (used0 < amount0Desired) {
            IERC20(token0).safeTransfer(msg.sender, amount0Desired - used0);
        }
        if (used1 < amount1Desired) {
            IERC20(token1).safeTransfer(msg.sender, amount1Desired - used1);
        }


        emit LiquidityAdded(tokenId, tokenA, tokenB, fee, amountA, amountB, tickLower, tickUpper);
    }

    /* Withdraw Liquidity */

    /**
     * Withdraw decrease liquidity from an existing position and collect.
     * Requires msg.sender to be owner or approved for tokenId on the PM.
     * Returns amounts collected to msg.sender.
     */
    function withdrawLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        address owner = positionManager.ownerOf(tokenId);
        require(owner == msg.sender || _isApprovedForNFT(tokenId, owner), "NOT_AUTH");

        // Read position details for event fields
        (, , address token0, address token1, uint24 fee, , , , , , ,) = positionManager.positions(tokenId);

        // Decrease liquidity (proceeds/fees become owed to the position)
        INonfungiblePositionManager.DecreaseLiquidityParams memory dec =
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: block.timestamp
            });
        positionManager.decreaseLiquidity(dec);

        // Collect everything owed directly to the user
        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        emit LiquidityRemoved(tokenId, token0, token1, fee, amount0, amount1);
    }

    /* Swap */

    /**
     * Single-hop exact input swap via ISwapRouter.exactInputSingle.
     * Pulls amountIn from user (requires ERC20 approval).
     */
    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint256 minOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "ZERO_IN");
        require(tokenIn != tokenOut, "SAME_TOKEN");

        // Pull from user and approve router
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(address(swapRouter), 0);
        IERC20(tokenIn).safeIncreaseAllowance(address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);

        emit TokensSwapped(tokenIn, tokenOut, fee, amountIn, amountOut);
    }

    /* Quote */

    function getQuote(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn
    ) external nonReentrant returns (uint256 quotedOut) {
        (quotedOut, , , ) = quoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: fee,
                sqrtPriceLimitX96: 0
            })
        );
    }
}
