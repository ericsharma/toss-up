import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import { Config, microAlgos } from '@algorandfoundation/algokit-utils';
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import algosdk from 'algosdk';
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account';
import { GameMakerClient, GameMakerFactory } from '../contracts/clients/GameMakerClient';

const fixture = algorandFixture();
Config.configure({ populateAppCallResources: true });

let appClient: GameMakerClient;
let owner: TransactionSignerAccount;
let player: TransactionSignerAccount;
let gameAppID: bigint;

describe('TossUp', () => {
  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;
    owner = testAccount;
    player = await fixture.context.generateAccount({ initialFunds: AlgoAmount.Algos(1000) });

    const factory = new GameMakerFactory({
      algorand,
      defaultSender: testAccount.addr,
    });

    // appClient = factory.getAppClientById({ appId: BigInt(3109) });

    const createResult = await factory.send.create.createApplication();
    appClient = createResult.appClient;

    algorand.send.payment({
      amount: AlgoAmount.Algos(1),
      receiver: appClient.appAddress,
      sender: testAccount.addr,
    });
  });

  test('Register Amount', async () => {
    const registerPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: owner.addr,
      to: appClient.appAddress,
      amount: 1_000_000,
      suggestedParams: await fixture.algorand.client.algod.getTransactionParams().do(),
    });

    const registerResponse = await appClient.send.register({
      args: {
        payment: registerPayment,
      },
      staticFee: microAlgos(5_000),
    });

    console.log(registerResponse.return!);
    gameAppID = registerResponse.return!;
  });

  test('Play game', async () => {
    // 821500
    const playPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: player.addr,
      to: appClient.appAddress,
      amount: 821_500, // amount in contract after minBalance requirements
      suggestedParams: await fixture.algorand.client.algod.getTransactionParams().do(),
    });

    const playResponse = await appClient.send.play({
      args: { payment: playPayment, appId: gameAppID },
      sender: player.addr,
      signer: player,
      staticFee: microAlgos(6_000),
    });

    console.log(playResponse.transactionID);
  });
});
