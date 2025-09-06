import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ERC20 } from "../../../generated/UniswapV3Adapter/ERC20"
import { ERC20Token, Token } from "../../../generated/schema"

export function getOrCreateToken(address: Address): ERC20Token {
  let token = ERC20Token.load(address)

  if (token == null) {
    token = new ERC20Token(address)

    let contract = ERC20.bind(address)

    // name
    let nameResult = contract.try_name()
    token.name = !nameResult.reverted ? nameResult.value : ""

    // symbol
    let symbolResult = contract.try_symbol()
    token.symbol = !symbolResult.reverted ? symbolResult.value : ""

    // decimals
    let decimalsResult = contract.try_decimals()
    token.decimals = !decimalsResult.reverted ? decimalsResult.value : BigInt.fromI32(18)

    token.save()
  }

  return token as ERC20Token
}
