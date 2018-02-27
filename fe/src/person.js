
import { mvc }    from "gemstone"

import { Bridge } from "./common.js"
import mask       from "./person.html"
import i18n       from "./person.yaml"
import                 "./person.css"

class View extends mvc.View {
    render () {
        /*  render the UI view mask fragment  */
        this.ui = this.mask("person", { render: mask, i18n: i18n })
        this.plug(this.ui)
    }
}

class Model extends mvc.Model {
    create () {
        /*  define the presentation model  */ /* =(1)= */
        this.model({
            "stateDisabled":  { value: true,  valid: "boolean" },
            "dataPerson":     { value: null,  valid: "object" },
            "dataUnits":      { value: [],    valid: "object" },
            "dataPersons":    { value: [],    valid: "object" },
            "dataName":       { value: null,  valid: "(string|null)" },
            "dataInitials":   { value: null,  valid: "(string|null)" },
            "dataRole":       { value: null,  valid: "(string|null)" },
            "dataSupervisor": { value: null,  valid: "(string|null)" },
            "dataBelongsTo":  { value: null,  valid: "(string|null)" }
        })

        /*  derive the enabled/disabled state  */ /* =(2)= */
        this.observe("dataPerson", (unit) => {
            this.value("stateDisabled", unit === null)
        })
    }
}

export default class Controller extends mvc.Controller {
    create () {
        this.establish("person-model/person-view", [ Model, View ])
    }
    prepare () {
        /*  define a data bridge between presentation and business model  */
        let bridge = new Bridge([
            { pm: "dataName",         bm: "name",         type: "attr" },
            { pm: "dataInitials",     bm: "initials",     type: "attr" },
            { pm: "dataRole",         bm: "role",         type: "attr" },
            { pm: "dataSupervisor",   bm: "supervisor",   type: "rel?" },
            { pm: "dataBelongsTo",    bm: "belongsTo",    type: "rel?" }
        ])

        /*  react on a new selected person  */
        let subscriptionPerson = null
        this.spool(() => {
            if (subscriptionPerson !== null)
                subscriptionPerson.unsubscribe()
        })
        this.subscribe("person-selected", (id) => {
            /*  short-circuit on re-selection  */
            let person = this.value("dataPerson")
            if (person !== null && person.id === id)
                return

            /*  unsubscribe previous subscription  */
            if (subscriptionPerson !== null) {
                subscriptionPerson.unsubscribe()
                subscriptionPerson = null
            }

            if (id === "") {
                /*  destroy previous selection  */
                this.value("dataPerson",       null)
                this.value("dataName",         "")
                this.value("dataInitials",     "")
                this.value("dataRole",         "")
                this.value("dataSupervisor",   null)
                this.value("dataBelongsTo",    null)
            }
            else {
                /*  provide new selection  */
                subscriptionPerson = this.sv().query(`($id: UUID!) {
                    Person (id: $id) {
                        id
                        name
                        initials
                        role
                        supervisor { id }
                        belongsTo  { id }
                    }
                }`, { id: id }).subscribe((result) => { /* =(3)= */
                    if (result && result.data && result.data.Person) {
                        let person = result.data.Person
                        this.value("dataPerson", person)
                        bridge.bm2pm(person, this)
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
                let person = this.value("dataPerson")
                let changeset = bridge.pm2bm(this, person)
                if (Object.keys(changeset).length === 0)
                    return
                await this.sv().mutation(`($id: UUID!, $with: JSON!) {
                    Person (id: $id) {
                        update (with: $with) { id }
                    }
                }`, {
                    id:   person.id,
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

