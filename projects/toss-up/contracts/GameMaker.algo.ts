import { Contract } from '@algorandfoundation/tealscript';
import { TossUp } from './TossUp.algo';

const contractMBRCost = 178500;

export class GameMaker extends Contract {
  programVersion = 11;

  ownerWins = GlobalStateKey<uint64>();

  playerWins = GlobalStateKey<uint64>();

  createApplication(): void {
    this.ownerWins.value = 0;
    this.playerWins.value = 0;
  }

  register(payment: PayTxn): AppID {
    verifyPayTxn(payment, { amount: { greaterThan: 0 } });

    const currentMBR = this.app.address.minBalance;

    sendMethodCall<typeof TossUp.prototype.createApplication>({
      clearStateProgram: TossUp.clearProgram(),
      approvalProgram: TossUp.approvalProgram(),
      methodArgs: [],
      globalNumByteSlice: TossUp.schema.global.numByteSlice,
      globalNumUint: TossUp.schema.global.numUint,
      localNumByteSlice: TossUp.schema.local.numByteSlice,
      localNumUint: TossUp.schema.local.numUint,
    });
    const mbrDelta = this.app.address.minBalance - currentMBR;

    const gameApp = this.itxn.createdApplicationID;
    sendMethodCall<typeof TossUp.prototype.register>({
      applicationID: gameApp,
      methodArgs: [{ amount: payment.amount - mbrDelta, receiver: gameApp.address }, this.txn.sender],
    });

    return gameApp;
  }

  play(payment: PayTxn, appID: AppID): void {
    const owner = appID.globalState('owner') as Address;
    const result = sendMethodCall<typeof TossUp.prototype.play>({
      applicationID: appID,
      methodArgs: [{ amount: payment.amount, receiver: appID.address }, this.txn.sender],
      onCompletion: OnCompletion.DeleteApplication,
    });

    if (result === 0) this.ownerWins.value += 1;
    if (result === 1) this.playerWins.value += 1;

    sendPayment({ receiver: owner, amount: contractMBRCost }); // send storage cost back to owner
  }
}
