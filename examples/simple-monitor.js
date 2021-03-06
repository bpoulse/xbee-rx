/*jslint node:true */

/*
 * examples/simple-monitor.js
 * https://github.com/101100/xbee-rx
 *
 * Simple example showing how to monitor incoming transmissions and how
 * to clean up on CTRL-C.
 *
 * Copyright (c) 2015-2016 Jason Heard
 * Licensed under the MIT license.
 */

"use strict";

var rx = require("rxjs");
rx.operators = require("rxjs/operators");

var xbeeRx = require("../lib/xbee-rx.js");

var xbee = xbeeRx({
    serialport: "/dev/ttyUSB0",
    serialportOptions: {
        baudRate: 57600
    },
    module: "ZigBee",
    // turn on debugging to see what the library is doing
    debug: false
});

console.log("Monitoring incoming packets (press CTRL-C to stop)");

// monitor CTRL-C to close serial connection
var stdin = process.stdin;
stdin.setRawMode(true);
var ctrlCStream = rx.fromEvent(stdin, "data").pipe(
    rx.operators.filter(function monitorCtrlCOnData(data) {
        return data.length === 1 && data[0] === 0x03; // Ctrl+C
    }),
    rx.operators.take(1)
);

var transmissionsStream = xbee.monitorTransmissions().pipe(
    rx.operators.pluck("data"),
    rx.operators.map(function (buffer) {
        var s = buffer.toString();
        return s === "\r" ? "\n" : s;
    })
);

transmissionsStream.pipe(
    rx.operators.takeUntil(ctrlCStream)
).subscribe(function (s) {
    process.stdout.write(s);
}, function (error) {
    console.log("Error during monitoring:\n", error);
    xbee.close();
    process.exit();
}, function () {
    console.log("\nGot CTRL-C; exiting.");
    xbee.close();
    process.exit();
});
