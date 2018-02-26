
import { mvc }    from "gemstone"

import { Bridge } from "./common.js"
import mask       from "./unit.html"
import i18n       from "./unit.yaml"
import                 "./unit.css"

class View extends mvc.View {
    render () {
        /*  render the UI view mask fragment  */
        this.ui = this.mask("unit", { render: mask, i18n: i18n })
        this.plug(this.ui)
    }
}

class Model extends mvc.Model {
    create () {
        /*  define the presentation model  */
        this.model({
            "stateDisabled":    { value: true,  valid: "boolean" },
            "dataUnit":         { value: null,  valid: "object" },
            "dataUnits":        { value: [],    valid: "object" },
            "dataPersons":      { value: [],    valid: "object" },
            "dataName":         { value: null,  valid: "(string|null)" },
            "dataAbbreviation": { value: null,  valid: "(string|null)" },
            "dataParentUnit":   { value: null,  valid: "(string|null)" },
            "dataDirector":     { value: null,  valid: "(string|null)" },
            "dataMembers":      { value: [],    valid: "[string*]" }
        })

        /*  derive the enabled/disabled state  */
        this.observe("dataUnit", (unit) => {
            this.value("stateDisabled", unit === null)
        })
    }
}

export default class Controller extends mvc.Controller {
    create () {
        this.establish("unit-model/unit-view", [ Model, View ])
    }
    prepare () {
        /*  define a data bridge between presentation and business model  */
        let bridge = new Bridge([
            { pm: "dataName",         bm: "name",         type: "attr" },
            { pm: "dataAbbreviation", bm: "abbreviation", type: "attr" },
            { pm: "dataParentUnit",   bm: "parentUnit",   type: "rel?" },
            { pm: "dataDirector",     bm: "director",     type: "rel?" },
            { pm: "dataMembers",      bm: "members",      type: "rel*" }
        ])

        /*  react on a new selected unit  */
        let subscriptionUnit = null
        this.spool(() => {
            if (subscriptionUnit !== null)
                subscriptionUnit.unsubscribe()
        })
        this.subscribe("unit-selected", (id) => {
            /*  short-circuit on re-selection  */
            let unit = this.value("dataUnit")
            if (unit !== null && unit.id === id)
                return

            /*  unsubscribe previous subscription  */
            if (subscriptionUnit !== null) {
                subscriptionUnit.unsubscribe()
                subscriptionUnit = null
            }

            if (id === "") {
                /*  destroy previous selection  */
                this.value("dataUnit",         null)
                this.value("dataName",         "")
                this.value("dataAbbreviation", "")
                this.value("dataParentUnit",   null)
                this.value("dataDirector",     null)
                this.value("dataMembers",      [])
            }
            else {
                /*  provide new selection  */
                subscriptionUnit = this.sv().query(`($id: UUID!) {
                    Unit (id: $id) {
                        id
                        name
                        abbreviation
                        parentUnit   { id }
                        director     { id }
                        members      { id }
                    }
                }`, { id: id }).subscribe((result) => {
                    if (result && result.data && result.data.Unit) {
                        let unit = result.data.Unit
                        this.value("dataUnit", unit)
                        bridge.bm2pm(unit, this)
                    }
                })
            }
        })

        /*  react on view mask edits  */
        let timer = null
        this.observe(bridge.fields.map((x) => x.pm), () => {
            if (timer !== null)
                clearTimeout(timer)
            timer = setTimeout(async () => {
                let unit = this.value("dataUnit")
                let changeset = bridge.pm2bm(this, unit)
                if (Object.keys(changeset).length === 0)
                    return
                await this.sv().mutation(`($id: UUID!, $with: JSON!) {
                    Unit (id: $id) {
                        update (with: $with) { id }
                    }
                }`, {
                    id:   unit.id,
                    with: changeset
                })
            }, 1000)
        }, { op: "changed" })

        /*  subscribe to list of Units and Persons  */
        let subscription = this.sv().query(`{
            Units   { id name }
            Persons { id name }
        }`).subscribe((result) => {
            if (result && result.data) {
                this.value("dataUnits",   result.data.Units)
                this.value("dataPersons", result.data.Persons)
            }
        })
        this.spool(() => subscription.unsubscribe())
    }
}

