
require("babel-register")({
    extensions: [ ".js" ],
    ignore:     /node_modules/,
    presets:    [ "env" ]
})
require("babel-polyfill")

/*  main procedure  */
require("co")(function * () {
    const path        = require("path")
    const Microkernel = require("microkernel")

    /*  instantiate a microkernel  */
    const kernel = new Microkernel()

    /*  define state transitions  */
    kernel.transitions([
        { state: "dead",       enter: null,        leave: null },
        { state: "booted",     enter: "boot",      leave: "shutdown" },
        { state: "latched",    enter: "latch",     leave: "unlatch" },
        { state: "configured", enter: "configure", leave: "reset" },
        { state: "prepared",   enter: "prepare",   leave: "release" },
        { state: "started",    enter: "start",     leave: "stop" }
    ])

    /*  define module groups  */
    kernel.groups([ "BOOT", "BASE", "RESOURCE", "SERVICE", "APP" ])

    /*  load modules into microkernel  */
    kernel.load(
        "microkernel-mod-ctx",
        [ "microkernel-mod-options", { inifile: "app.ini" } ],
        "microkernel-mod-logger",
        "microkernel-mod-daemon",
        "microkernel-mod-title",
        "microkernel-mod-shutdown",
        "microkernel-mod-sequelize",
        "microkernel-mod-graphqlio",
        path.join(__dirname, "api.js"),
        path.join(__dirname, "db.js")
    )

    /*  startup microkernel and its modules  */
    yield kernel.state("started").then(function onSuccess () {
        kernel.publish("app:start:success")
    }).catch(function onError (err) {
        kernel.publish("app:start:error", err)
        throw err
    })
}).catch(function (err) {
    console.log("ERROR: failed to start: " + err + "\n" + err.stack)
})

