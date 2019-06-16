
import { $, mvc, mousetrap } from "gemstone"

import Units   from "./units.js"
import Unit    from "./unit.js"
import Persons from "./persons.js"
import Person  from "./person.js"

import mask    from "./screen.html"
import i18n    from "./screen.yaml"
import              "./screen.css"

class View extends mvc.View {
    render () {
        /*  render and attach the UI view mask fragment  */
        this.ui = this.mask("screen", { render: mask, i18n: i18n })
        this.plug(this.ui)

        /*  make screen resizable  */
        $(this.ui.$el).resizable({ /* =(1)= */
            handleSelector:   ".resizeHandle",
            resizeWidth:      true,
            resizeHeight:     true,
            resizeWidthFrom:  "right",
            resizeHeightFrom: "bottom",
            onDragStart: (e, $el, opt) => { $el.css("cursor", "nwse-resize") },
            onDragEnd:   (e, $el, opt) => { $el.css("cursor", "") },
            onDrag: (e, $el, newWidth, newHeight, opt) => {
                if (newWidth  < 600) newWidth  = 600
                if (newHeight < 400) newHeight = 400
                $el.width(newWidth)
                $el.height(newHeight)
                return false
            }
        })

        /*  allow user to easily switch the UI language  */
        mousetrap.bind("ctrl+a l", () => {
            let lang = this.value("gsLang")
            this.value("gsLang", lang !== "en" ? "en" : "de")
        })
    }
}

class Model extends mvc.Model {
    create () {
        /*  define the presentation model  */ /* =(2)= */
        this.model({
            "dataScreenHint":     { value: "",        valid: "string" },
            "dataOnlineStatus":   { value: "offline", valid: "string" },
            "dataOnlineProgress": { value: false,     valid: "boolean" },
            "dataOnlineUsers":    { value: 0,         valid: "number" }
        })

        /*  automatically clear the status model field after 5s  */ /* =(3)= */
        this.timer = null
        this.observe("dataScreenHint", () => {
            if (this.timer !== null)
                clearTimeout(this.timer)
            this.timer = setTimeout(() => {
                this.value("dataScreenHint", "")
            }, 5 * 1000)
        })
    }
}

export default class Controller extends mvc.Controller {
    create () {
        /*  create the component tree  */
        this.establish(
            "screen-model/screen-view/{units,unit,persons,person}",
            [ Model, View, Units, Unit, Persons, Person ]
        )
    }
    async prepare () {
        /*  hook into service error reporting  */
        this.sv().on("error", (err) => {
            /* eslint no-console: off */
            this.value("dataScreenHint", err)
            console.log(`[SV] ERROR: ${err}`)
        })

        /*  hook into service connection reporting  */ /* =(4)= */
        this.sv().on("open",  () => this.value("dataOnlineStatus", "online"))
        this.sv().on("close", () => this.value("dataOnlineStatus", "offline"))

        /*  connect to the backend...  */
        await this.sv().connect()
        this.spool(() => this.sv().disconnect())

        /*  subscribe to the server status  */
        let subscription = this.sv().query(`{
            _Server { clients }
        }`).subscribe((result) => {
            if (result && result.data && result.data._Server)
                this.value("dataOnlineUsers", result.data._Server.clients)
        })
        this.spool(() => subscription.unsubscribe())

        /*  master/detail communication  */ /* =(5)= */
        this.subscribe("unit-add", (id) => {
            this.my("unit").publish("unit-added", id)
        })
        this.subscribe("unit-delete", (id) => {
            this.my("unit").publish("unit-deleted", id)
        })
        this.subscribe("unit-select", (id) => {
            this.my("unit").publish("unit-selected", id)
        })
        this.subscribe("person-add", (id) => {
            this.my("person").publish("person-added", id)
        })
        this.subscribe("unit-delete", (id) => {
            this.my("person").publish("person-deleted", id)
        })
        this.subscribe("person-select", (id) => {
            this.my("person").publish("person-selected", id)
        })
    }
}


