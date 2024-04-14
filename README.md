### Crypto Voting

A way for XRPL users to vote in a decentralized manner. It uses the XRPL devnet, which allowed for quicker development. This is not anonymous, each person's vote is public.

Certain node modules must be installed, these being ws (WebSockets) and xlpr.

## Election

First, a user submits a transaction labeled as an election. The important information in the election transaction is actually in the Memos field, and the transaction itself does not matter.

An election transaction has 4 special memos, and an optional fifth to give a description. The MemoData in the first four memos of an election transaction are as follows:

At index zero, "313C7170" (The magic bytes signifying an election transaction)

At index one, a hex-encoded list containing the addresses of all the voters who may vote in the election. There should be a newline between each address.

At index two, the start time of the voting period in the same format as ledger close times. This is written in decimal, with a possible "0" at front to even out the number of digits.

At index three, the end time of the voting period in the same format.

This can be done using

`node election.mjs <secretkeyfile> <voteraddressfile> [-m=message] [-s=starttime] [-d=duration]`

Where secretkeyfile contains the election submitter's secret key and voteraddressfile contains the addresses of all voters on separate lines.

The output of this command shows information about the transaction, where the user can find the hash of the transaction that was submitted.

## Voting

Votes are also represented as transactions with special memos.

At index zero, "1337B07E" (The magic bytes)

At index one, the hash of the election transaction that the user is voting on.

At index two, the user's vote as a hex-encoded string.

To submit a vote, run:

`node vote.mjs <secretkey> <electionhash> <vote>`

For this one, secretkey comes from the command, not a file.

The output of the command also shows information about the transaction, but it should not normally be necessary.

## Tallying

Tallying is meant for anyone to be able to do, even those who did not submit the election or vote. Tallying an election involves inspecting all ledgers that were closed during the election's voting period.  A voter can only vote once! The only vote that will be counted during tallying is the voter's first vote.

To tally an election, run

`node tally.mjs <electionhash>`

This searches through devnet.xrplwin.com only requesting JSON documents. This allows a tallyer to tally an election without operating their own rippled server.

## Webpage

index.html and styles.css show how a non-commandline interface could look for Crypto Voting.

Check it out at https://csterlent.github.io/CryptoVoting/
