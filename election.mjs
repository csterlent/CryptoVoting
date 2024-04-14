// Start an election
// the arguments are [-m=message] [-s=starttime] [-d=duration] <secretkeyfile> <voteraddressfile>

import pkg from "xrpl";
const {Client, Wallet} = pkg;
const fs = await import ('node:fs');

function getXrpTime() {
  return Math.floor((new Date().getTime()/100 - 9466812000 - 36000)/10);
}

let message = '';
// convert unix epoch time to the time used by xrpl
let start_time = '' + getXrpTime();
let duration;
let secret_key;
let voters_addrs;
// I am crumching here
for (let arg of process.argv.slice(2)) {
  if (arg.startsWith("-m=")) {
    message = arg.slice(3);
  }
  else if (arg.startsWith("-s=")) {
    start_time = arg.slice(3);
  }
  else if (arg.startsWith("-d=")) {
    duration = arg.slice(3);
  }
  else if (secret_key == undefined) {
    secret_key = fs.readFileSync(arg).toString().trim();
  }
  else if (voters_addrs == undefined) {
    voters_addrs = fs.readFileSync(arg).toString().trim();
  }
  else {
    console.log("Arguments: [-m=message] [-s=starttime] [-d=duration] <secretkeyfile> <voteraddressfile>");
    process.exit();
  }
}
if (start_time.length % 2) {
  start_time = '0'+start_time;
}

// also protect user from accidentally Memo'ing with their secret key
if (voters_addrs == undefined || secret_key == voters_addrs) {
  console.log("Arguments: [-m=message] [-s=starttime] [-d=duration] <secretkeyfile> <voteraddressfile>");
  process.exit();
}

console.log(secret_key[30]);

let end_time = '999999999999';
if (duration != undefined) {
  end_time = start_time + duration;
}
if (end_time.length % 2) {
  end_time = '0'+end_time;
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

async function main() {
  let net = "wss://s.devnet.rippletest.net:51233/";
  let client = new Client(net);
  await client.connect();

  let wallet = Wallet.fromSeed(secret_key);

  let election = await client.autofill({
    TransactionType: 'Payment',
    Account: wallet.address,
    Destination: 'rKdQEAPj7RD8gSm5FXutdsreLL3KKGrucp', // we making money
    Amount: "1",
    Memos: [
      {Memo: {MemoData: "313C7170"}},
      {Memo: {MemoData: hexEncode(voters_addrs)}},
      {Memo: {MemoData: start_time}},
      {Memo: {MemoData: end_time}},
      {Memo: {MemoData: hexEncode(message)}}
    ]
  });
  let signed = wallet.sign(election)

  console.log(await client.submitAndWait(signed.tx_blob));
}

main();
