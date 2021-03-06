/*jslint node:true */

/*
 * examples/button.js
 * https://github.com/101100/xbee-rx
 *
 * Example showing the use of monitorIODataPackets to detect button presses.
 *
 * This requires that you have a node set up to send digital IO samples when
 * a change is detected in digital input pin AD1, that a button is connected
 * between the AD1 pin and ground and that a pull-up resistor is enabled for
 * that pin.
 *
 * Copyright (c) 2016 Jason Heard
 * Licensed under the MIT license.
 */

"use strict";

var xbeeRx = require("../lib/xbee-rx.js");

var rx = require("rxjs");
rx.operators = require("rxjs/operators");

var xbee = xbeeRx({
    serialport: "/dev/ttyUSB0",
    serialportOptions: {
        baudRate: 57600
    },
    module: "ZigBee",
    // turn on debugging to see what the library is doing
    debug: false
});

var buttonPressStream = xbee.monitorIODataPackets().pipe(
        // ignore any packets at program startup
        rx.operators.skipUntil(rx.timer(100)),
        // extract just the DIO1 sample (1 (released) or 0 (pressed))
        rx.operators.pluck("digitalSamples", "DIO1"),
        // pluck results in undefined if the sample doesn't exist, so filter that out
        rx.operators.filter(function (sample) {
            return sample !== undefined;
        }),
        // ignore any repeats
        rx.operators.distinctUntilChanged(),
        rx.operators.timeInterval(),
        // the button is pressed when the button is released after being pressed for less than 1 second
        rx.operators.filter(function (x) {
            return x.value === 1 && x.interval < 1000;
        }),
        // ignore multiple button presses within one second
        rx.operators.throttle(1000)
    );

buttonPressStream
    .subscribe(function () {
        console.log("Button pressed!");
    }, function (error) {
        console.log("Error during monitoring:\n", error);
        xbee.close();
    }, function () {
        console.log("Monitoring stream ended; exiting.");
        xbee.close();
    });
