import { BigInt } from "@graphprotocol/graph-ts"
import {
  LiquidityAdded as LiquidityAddedEvent,
  LiquidityRemoved as LiquidityRemovedEvent,
  TokensSwapped as TokensSwappedEvent
} from "../../../generated/UniswapV3Adapter/UniswapV3Adapter"
import { Pair, LiquidityAdded, LiquidityRemoved, TokensSwapped } from "../../../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"
import { getOrCreateToken } from "./utils"
import { Address } from "@graphprotocol/graph-ts"
// Helper to create or load a Pair entity
function getPair(id: string, tokenA: Bytes, tokenB: Bytes): Pair {
  let pair = Pair.load(id)

  if (pair == null) {
    pair = new Pair(id)

    let token0 = getOrCreateToken(Address.fromBytes(tokenA))
    let token1 = getOrCreateToken(Address.fromBytes(tokenB))

    pair.token0 = token0.id
    pair.token1 = token1.id
    pair.pool = Bytes.empty()
    pair.createdAtTimestamp = BigInt.fromI32(0)
    pair.createdAtBlockNumber = BigInt.fromI32(0)
    pair.save()
  }

  return pair as Pair
}

export function handleLiquidityAdded(event: LiquidityAddedEvent): void {
  let pairId = event.params.tokenA.toHex() + "-" + event.params.tokenB.toHex()
  let pair = getPair(pairId, event.params.tokenA, event.params.tokenB)

  let entity = new LiquidityAdded(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  entity.pair = pair.id
  entity.tokenId = event.params.tokenId
  entity.amountA = event.params.amountA
  entity.amountB = event.params.amountB
  entity.createdAtTimestamp = event.block.timestamp
  entity.createdAtBlockNumber = event.block.number
  entity.save()
}

export function handleLiquidityRemoved(event: LiquidityRemovedEvent): void {
  let pairId = event.params.tokenA.toHex() + "-" + event.params.tokenB.toHex()
  let pair = getPair(pairId, event.params.tokenA, event.params.tokenB)

  let entity = new LiquidityRemoved(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  entity.pair = pair.id
  entity.tokenId = event.params.tokenId
  entity.amountA = event.params.amount0
  entity.amountB = event.params.amount1
  entity.createdAtTimestamp = event.block.timestamp
  entity.createdAtBlockNumber = event.block.number
  entity.save()
}

export function handleTokensSwapped(event: TokensSwappedEvent): void {
  let pairId = event.params.tokenIn.toHex() + "-" + event.params.tokenOut.toHex()
  let pair = getPair(pairId, event.params.tokenIn, event.params.tokenOut)

  let entity = new TokensSwapped(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  entity.pair = pair.id
  entity.amountIn = event.params.amountIn
  entity.amountOut = event.params.amountOut
  entity.createdAtTimestamp = event.block.timestamp
  entity.createdAtBlockNumber = event.block.number
  entity.save()
}
