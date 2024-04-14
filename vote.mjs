import pkg from "xrpl";
const {Client, Wallet} = pkg;
const fs = await import ('node:fs');

function getXrpTime() {
  return Math.floor(new Date().getTime()/1000 - 946681200 - 3600);
}

function hexEncode(str) {
  var out = '';
  for (var i = 0; i < str.length; i++) {
    let addition = str.charCodeAt(i).toString(16); // thanks geoff from SO
    if (addition.length == 1) {
      addition = '0' + addition;
    }
    out += addition;
  }
  return out;
}

function hexDecode(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const hexValue = hex.substr(i, 2);
    const decimalValue = parseInt(hexValue, 16);
    str += String.fromCharCode(decimalValue);
  }
  return str;
}

async function main() {
  let net = "wss://s.devnet.rippletest.net:51233/";
  let client = new Client(net);
  await client.connect();

  if (process.argv.length < 5) {
    console.log("Supply secret key then election hash then your vote as arguments!");
    process.exit;
  }
  let secret_key = process.argv[2];
  let election_hash = process.argv[3];
  let vote = process.argv[4]
  let wallet = Wallet.fromSeed(secret_key);

  let url = "https://devnet.xrplwin.com/tx/" + election_hash + ".json";
  let election_trans = await (await fetch(url)).json();

  const voters_addrs = hexDecode(election_trans.result.Memos[1].Memo.MemoData);
  const start_time = election_trans.result.Memos[2].Memo.MemoData;
  const end_time = election_trans.result.Memos[3].Memo.MemoData;
  console.log(voters_addrs, start_time, end_time);

  if (getXrpTime() > parseInt(end_time)) {
    console.log("Warning: current time is past voting period");
  }
  if (getXrpTime() < parseInt(start_time)) {
    console.log("Warning: current time is before voting period");
  }
  if (voters_addrs.indexOf(wallet.address) == -1) {
    console.log("Warning: this address has no permission to vote in this election");
  }

  let election = await client.autofill({
    TransactionType: 'Payment',
    Account: wallet.address,
    Destination: 'rKdQEAPj7RD8gSm5FXutdsreLL3KKGrucp', // we making money
    Amount: "1",
    Memos: [
      {Memo: {MemoData: "1337B07E"}},
      {Memo: {MemoData: hexEncode(election_hash)}},
      {Memo: {MemoData: hexEncode(vote)}}
    ]
  });
  let signed = wallet.sign(election)

  console.log(await client.submitAndWait(signed.tx_blob));
}

main();
