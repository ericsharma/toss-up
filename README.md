# TossUp Game

## Project Overview

TossUp is an attempt to achieve on-chain psuedorandomness disguised as a head to head coin flip like game. My half baked idea is to indirectly leverage VRF by [accessing block proposers in the avm](https://github.com/algorandfoundation/TEALScript/blob/dev/tests/contracts/avm11.algo.ts#L30) with pragma v11.

The project consists of:

- Smart contracts written in TealScript that manage the game logic and funds
- A Next.js frontend that provides a user-friendly interface to interact with the contracts
- A "register and play" system where users can either create games or play existing games created by others

## Frontend Usage Guide

### Creating a Game (Register)

1. Switch to the "Register Game" tab
2. Enter your wager amount in MicroAlgos (1 ALGO = 1,000,000 MicroAlgo)
3. Click "Register Game" to create a new game instance
4. The transaction will be signed with your connected Algorand wallet
5. Once confirmed, your game will be available for others to play

### Playing an Existing Game

1. Switch to the "Open Games" tab
2. Browse available games - each card shows the owner's address and the wager amount
3. Click "Play" on any game to match the wager and play
4. The outcome will be determined by the random mechanism in the smart contract
5. Funds will be automatically transferred to the winner

### View Game Statistics

The dashboard header displays:

- Total owner (house) wins
- Total player wins
- Owner win percentage

Click "Refresh Stats" to update the displayed information.

## Testnet AppID

736389917

## Smart Contract Architecture

### GameMaker Contract

The GameMaker contract is responsible for:

- Creating new TossUp game instances
- Tracking game results (owner wins vs player wins)
- Managing the deployment of individual games

Key methods:

- `createApplication()`: Initializes the game bookkeeping contract
- `register(payment)`: Creates a new TossUp game with the provided wager
- `play(payment, appID)`: Plays a game and records the result

### TossUp Contract

The TossUp contract handles the logic for individual games:

- Holds the game funds
- Implements the random outcome generator
- returns the random outcome to the GameMaker contract

Key methods:

- `register(payment, owner)`: Initializes a game with the owner and wager amount
- `play(payment, player)`: Executes the game logic and distributes funds
- `getRandom(player)`: Generates a pseudo-random number for fair outcome determination

## Random Methodology Explained

The `getRandom()` function in TossUp.algo.ts generates randomness through a multi-step process that draws entropy from blockchain data:

```typescript
private getRandom(player: Address): uint64 {
  let seed: uint64;

  const blockSeed =
    extractUint64(blocks[this.txn.firstValid - 1].seed, blocks[this.txn.firstValid - 1].timestamp % 24) % 24;

  const proposer = blocks[this.txn.firstValid - 1].proposer;

  const maxSeed = 4294967295; // maximum uint that prevents overflow

  const playerSeed = extractUint64(player, blockSeed) % maxSeed;
  const ownerSeed = extractUint64(this.owner.value, blockSeed) % maxSeed;

  const intraRoundRandomness = (playerSeed * ownerSeed) % 24;

  if (proposer === globals.zeroAddress) {
    // For localnet testing
    seed = extractUint64(player, intraRoundRandomness);
  } else {
    seed = extractUint64(proposer, intraRoundRandomness);
  }

  return seed;
}
```

The randomness generation works as follows:

1. **Block-derived entropy**: Uses data from the previous block including:

   - Block seed
   - Block timestamp
   - Block proposer

2. **Player-specific entropy**:

   - Extracts a value from the player's address
   - Extracts a value from the owner's address
   - Combines these with the block-derived values

3. **Combination logic**:

   - Multiplies player and owner derived values
   - Modulo operations ensure values stay within acceptable ranges

4. **Final outcome**:
   - Returns the seed value
   - Game outcome is determined by whether the seed is even or odd (`seed % 2`)

## “Castell d’Code” Developer Retreat 2025

I would love for this to be improved upon in many ways, here are a few ideas:

### Game Mechanics

1. **Tournament Mode**

   - Allow users to organize tournaments with multiple rounds
   - Create brackets and elimination structures

2. **Time-based Mechanics**
   - Add time limits for game participation
   - Implement auto-refunds for games not played within time limits

### UX Improvements

1. **Game History**

   - Add a personal game history section
   - Implement replay functionality

2. **Social Features**

   - Support for NF Domains
   - Add a leaderboard for top players

3. **Enhanced Visualizations**
   - Animated coin flip
   - Visual indicators of randomness sources

### Measuring Fairness

To verify the 50/50 outcome distribution:

1. **Statistical Analysis Framework**

   - Develop a test framework to simulate thousands of games
   - Apply statistical tests (chi-square, z-test) to evaluate fairness

2. **Real-world Analysis Dashboard**

   - Track actual game outcomes over time
   - Visualize distribution and detect anomalies

3. **Compare Alternative Implementations**
   - Implement multiple randomness algorithms in test environments
   - Compare their statistical properties against the current algorithm

## Tech Stack

- **Smart Contract Development**:
  - [TealScript](https://github.com/algorandfoundation/TEALScript)
  - [AlgoKit](https://github.com/algorandfoundation/algokit-cli)
- **Frontend**:
  - [use-wallet](https://github.com/TxnLab/use-wallet)
  - Next.js
  - React
  - Tailwind CSS
  - shadcn/ui components
