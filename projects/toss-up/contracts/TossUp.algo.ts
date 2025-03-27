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

  private getRandom(): uint64 {
    const proposer = blocks[this.txn.firstValid - 1].proposer;
    const blockSeed = blocks[this.txn.firstValid - 1].seed;

    const seed = getbyte(sha256(concat(proposer, blockSeed)), 0);
    // My interpretation of Funk's suggestion: https://discord.com/channels/491256308461207573/1352324685207175269/1354835871152607453
    // One downside of this approach is that the seed will be the same for all transactions in the same block

    return seed;
  }

  @allow.call('DeleteApplication')
  play(payment: PayTxn, player: Address): uint64 {
    asserts(player !== this.owner.value, this.amount.value === payment.amount, this.txn.sender === this.app.creator);

    const seed = this.getRandom();

    if (seed % 2 === 0) {
      sendPayment({ receiver: this.owner.value, amount: this.amount.value + payment.amount });
    } else {
      sendPayment({ receiver: player, amount: this.amount.value + payment.amount });
    }

    sendPayment({ closeRemainderTo: this.owner.value });
    return seed % 2;
  }
}
