import { Contract } from '@algorandfoundation/tealscript';

export class TossUp extends Contract {
  programVersion = 11;

  owner = GlobalStateKey<Address>();

  amount = GlobalStateKey<uint64>();

  createApplication(): void {}

  register(payment: PayTxn, owner: Address): Address {
    verifyPayTxn(payment, { amount: { greaterThan: 0 } });
    this.owner.value = owner;
    this.amount.value = payment.amount;
    return this.owner.value;
  }

  private getRandom(player: Address): uint64 {
    let seed: uint64;

    const blockSeed =
      extractUint64(blocks[this.txn.firstValid - 1].seed, blocks[this.txn.firstValid - 1].timestamp % 24) % 24;

    const proposer = blocks[this.txn.firstValid - 1].proposer;

    // unfortunatley we cannot use proposer.lastHeartBeat as it is not available in the smart contract without passing proposer as a reference which we don't want to do
    // const heartBeatSeed = proposer.lastHeartbeat % 24; // mod 24 since thats the last valid starting index for extractUint64()

    // blocks[globals.round - 2]. // update the proposer's lastHeartBeat to the current round
    const maxSeed = 4294967295; // maximum uint that will allow for maxSeed * maxSeed without causing an overflow

    const playerSeed = extractUint64(player, blockSeed) % maxSeed; // introduce something unique to the player so the random seed is different for games within the same round

    const ownerSeed = extractUint64(this.owner.value, blockSeed) % maxSeed; // introduce something unique to owner so the random seed is different for games from the same player within the same round

    const intraRoundRandomness = (playerSeed * ownerSeed) % 24;

    if (proposer === globals.zeroAddress) {
      // if proposer is zeroAddress then we're in localnet so choose a different dynamic seed
      seed = extractUint64(player, intraRoundRandomness);
    } else {
      seed = extractUint64(proposer, intraRoundRandomness);
    }

    return seed;
  }

  @allow.call('DeleteApplication')
  play(payment: PayTxn, player: Address): uint64 {
    asserts(player !== this.owner.value, this.amount.value === payment.amount, this.txn.sender === this.app.creator);

    const seed = this.getRandom(player);

    if (seed % 2 === 0) {
      sendPayment({ receiver: this.owner.value, amount: this.amount.value + payment.amount });
    } else {
      sendPayment({ receiver: player, amount: this.amount.value + payment.amount });
    }

    sendPayment({ closeRemainderTo: this.owner.value });
    return seed % 2;
  }
}
