const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("The Reward Factory", async () => {
  let deployer, stakedCoin, rewardCoin, user, pool, accounts;
  let earnedELE, stakedAmount;
  beforeEach(async () => {
    accounts = await hre.ethers.getSigners();
    deployer = accounts[0];
    user = accounts[1].address;
    const StakedCoin = await hre.ethers.getContractFactory("Token");
    const RewardCoin = await hre.ethers.getContractFactory("Token");
    const Pool = await hre.ethers.getContractFactory("StakingRewards");

    stakedCoin = await StakedCoin.deploy("PROTON", "PTR", "100000");
    rewardCoin = await RewardCoin.deploy("ELECTRON", "ELE", "100000");
    pool = await Pool.deploy(stakedCoin.address, rewardCoin.address);

    let transaction = await stakedCoin
      .connect(deployer)
      .approve(user, tokens(100));
    await transaction.wait();

    transaction = await stakedCoin
      .connect(deployer)
      .transfer(user, tokens(100));
    await transaction.wait();

    let Approve = await stakedCoin
      .connect(accounts[1])
      .approve(pool.address, tokens(25));
    await Approve.wait();

    stakedAmount = tokens(25);

    transaction = await pool.connect(accounts[1]).stake(stakedAmount);
    await transaction.wait();

    // Setting the duartion
    await pool.connect(deployer).setRewardsDuration("604800000");

    transaction = await rewardCoin
      .connect(deployer)
      .transfer(pool.address, tokens(1000));
    await transaction.wait();

    await pool.connect(deployer).notifyRewardAmount(tokens(1));
  });

  describe("Earned ELECTRON", async () => {
    it(`should withdraw the amount from pool and claim the reward`, async () => {
      // expect(await stakedCoin.balanceOf(user)).to.equal(tokens(500));

      expect(await stakedCoin.balanceOf(user)).to.equal(tokens(75));

      console.log(
        "The amount of PTR staked in the pool",
        stakedAmount / tokens(1)
      );
      await time.increase(8640000);

      earnedELE = await pool.connect(user).earned(user);

      console.log("ELECTRON EARNED:", earnedELE / tokens(1));

      console.log("After 24 hours ");

      console.log("Withdrawing the staked Coins");
      await pool.connect(accounts[1]).withdraw(tokens(25));
      expect(await stakedCoin.balanceOf(user)).to.equal(tokens(100));
      console.log(
        "Balance of user after withdrawing",
        (await stakedCoin.balanceOf(user)) / tokens(1)
      );

      console.log("Taking the rewards");

      await pool.connect(accounts[1]).getReward();
      expect(await pool.connect(user).rewards(user)).to.equal(tokens(0));

      //
      console.log(
        "Amount of ETR earned",
        (await rewardCoin.balanceOf(user)) / tokens(1)
      );
    });
  });
});
