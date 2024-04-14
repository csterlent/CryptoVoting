const WebSocket = require("ws")

if (process.argv.length < 3) {
  console.log("Supply the election transaction hash as an argument");
  process.exit();
}
const election_hash = process.argv[2];

function getXrpTime() {
  return Math.floor(new Date().getTime()/1000 - 946681200 - 3600);
}

async function main() {
  let url = "https://devnet.xrplwin.com/tx/" + election_hash + ".json";
  let election_trans = await (await fetch(url)).json();

  function hexDecode(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const hexValue = hex.substr(i, 2);
      const decimalValue = parseInt(hexValue, 16);
      str += String.fromCharCode(decimalValue);
    }
    return str;
  }

  const voters_addrs = hexDecode(election_trans.result.Memos[1].Memo.MemoData);
  const start_time = parseInt(election_trans.result.Memos[2].Memo.MemoData);
  const end_time = parseInt(election_trans.result.Memos[3].Memo.MemoData);
  const chosen = {};
  if (election_trans.result.Memos.length > 4)
    console.log(hexDecode(election_trans.result.Memos[4].Memo.MemoData))
  console.log("Start of voting period: " + start_time);
  console.log("End of voting period: " + end_time);
  console.log("Time right now: " + getXrpTime());
  console.log("Addresses of voters:");
  console.log(voters_addrs);
  console.log();

  // found a website for exploring the devnet ledger
  // the page uses a websocket to get raw ledger data and I will too

  // enough trans thoughts, its time for transactions
  // gets called every transaction within the voting period, in reverse order
  function process_transaction(trans) {
    if (!trans.Memos || trans.Memos.length < 3) {
      return;
    }
    // Memos are: [0] magic bytes, [1] hash of election, [2] voter's choice
    if (trans.Memos[0].Memo.MemoData != "1337B07E") {
      return;
    }
    if (hexDecode(trans.Memos[1].Memo.MemoData) != election_hash) {
      return;
    }
    // Check if this voter is allowed in this election
    if (voters_addrs.indexOf(trans.Account) == -1) {
      return;
    }
    let vote = hexDecode(trans.Memos[2].Memo.MemoData);
    console.log(trans.Account, vote);
    chosen[trans.Account] = vote;
  }

  function ledger_json(ledger) {
    request = {
      command: "ledger",
      transactions: true,
      expand: true,
    }
    return JSON.stringify({ ledger_index: ledger, ...request });
  }

  // gets called when all transactions have been processed in the window
  function finalize() {
    console.log();
    console.log("Num\tOption");
    inverse = {};
    for (key in chosen) {
      if (inverse[chosen[key]] == undefined) {
        inverse[chosen[key]] = 0;
      }
      else {
        inverse[chosen[key]]++;
      }
    }
    for (key in inverse) {
      console.log(inverse[key] + "\t" + key);
    }
  }

  let sock = new WebSocket("wss://s.devnet.rippletest.net:51233/");

  // only executed in the first response
  sock.once('message', (response) => {
    let x = JSON.parse(response.toString())
    // the object has a field like "first-last" and we want "last"
    let ledger = +x.result.info.complete_ledgers.split('-')[1];

    sock.on('message', (response) => {
      let x = JSON.parse(response.toString())
      if (parseInt(x.result.ledger.close_time) < end_time) {
        for (trans of x.result.ledger.transactions.reverse()) {
          process_transaction(trans);
        }
      }
      if (parseInt(x.result.ledger.parent_close_time) > start_time) {
        ledger -= 1;
        sock.send(ledger_json(ledger));
      }
      else {
        finalize();
      }
    });
    sock.send(ledger_json(ledger));
  });

  sock.on('open', () => {
    sock.send('{"command": "server_info"}')
  });

}
await main();
