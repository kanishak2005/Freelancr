import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const payout = await mongoose.connection.collection('payouts').findOne({ _id: new mongoose.Types.ObjectId('6ad3c7af4642f03865b38925') });
  console.log('=== PAYOUT DOCUMENT ===');
  console.log(JSON.stringify(payout, null, 2));

  if (payout) {
    const contract = await mongoose.connection.collection('contracts').findOne({ _id: payout.contract });
    console.log('--- CONTRACT ---');
    console.log(JSON.stringify(contract, null, 2));

    const payment = await mongoose.connection.collection('payments').findOne({ _id: payout.payment });
    console.log('--- PAYMENT ---');
    console.log(JSON.stringify(payment, null, 2));

    const freelancer = await mongoose.connection.collection('users').findOne({ _id: payout.freelancer }, { projection: { password: 0, refreshTokens: 0 } });
    console.log('--- FREELANCER ---');
    console.log(JSON.stringify(freelancer, null, 2));

    const wallet = await mongoose.connection.collection('wallets').findOne({
      $or: [
        { userId: payout.freelancer },
        { _id: new mongoose.Types.ObjectId('6ad3c77c4642f03865b3891e') }
      ]
    });
    console.log('--- WALLET ---');
    console.log(JSON.stringify(wallet, null, 2));

    const ledgers = await mongoose.connection.collection('financialledgers').find({ 
      $or: [
        { user: payout.freelancer },
        { payout: payout._id },
        { contract: payout.contract }
      ] 
    }).toArray();
    console.log('--- LEDGERS ---');
    console.log(JSON.stringify(ledgers, null, 2));

    const audits = await mongoose.connection.collection('auditlogs').find({
      $or: [
        { targetId: '6ad3c7af4642f03865b38925' },
        { 'metadata.payoutId': '6ad3c7af4642f03865b38925' },
        { targetId: payout.contract ? payout.contract.toString() : '' }
      ]
    }).sort({ timestamp: 1 }).toArray();
    console.log('--- AUDITS ---');
    console.log(JSON.stringify(audits, null, 2));
  } else {
    console.log('Payout not found with ID 6ad3c7af4642f03865b38925');
    // List all payouts in DB
    const allPayouts = await mongoose.connection.collection('payouts').find({}).toArray();
    console.log('--- ALL PAYOUTS IN DB ---');
    console.log(JSON.stringify(allPayouts, null, 2));
  }
  await mongoose.disconnect();
}
inspect().catch(err => { console.error('ERROR:', err); process.exit(1); });
