import { Address, ethereum, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { ERC20 as ERC20Contract } from "../../../generated/UniswapV3Adapter/ERC20"

export function getTokenName(tokenAddress: Address): string {
  const contract = ERC20Contract.bind(tokenAddress)
  const nameResult = contract.try_name()
  return nameResult.reverted ? 'Unknown' : nameResult.value
}

export function getTokenSymbol(tokenAddress: Address): string {
  const contract = ERC20Contract.bind(tokenAddress)
  const symbolResult = contract.try_symbol()
  return symbolResult.reverted ? 'UNKNOWN' : symbolResult.value
}

export function getTokenDecimals(tokenAddress: Address): BigInt {
  const contract = ERC20Contract.bind(tokenAddress)
  const decimalsResult = contract.try_decimals()
  return BigInt.fromI32(decimalsResult.reverted ? 18 : decimalsResult.value)
}
