
/*  external imports  */
import { $, mvc } from "gemstone"
import minimatch  from "minimatch"

/*  internal imports  */
import mask       from "./roster.html"
import i18n       from "./roster.yaml"
import                 "./roster.css"

/*  MVC/CT View  */
class View extends mvc.View {
    render () {
        /*  render UI fragment  */
        this.ui = this.mask("roster", { render: mask, i18n: i18n })
        this.plug(this.ui)

        /*  react on a command to scroll and select the end of the items  */
        this.observe("cmdScrollToEnd", () => { /* =(1)= */
            setTimeout(() => {
                $(this.ui.$refs.body).scrollTo("max")
                let items = this.value("dataItems")
                this.value("eventItemSelect", items[items.length - 1])
            }, 100)
        })
    }
}

/*  MVC/CT Model  */
export default class Model extends mvc.Model {
    create () {
        /*  create component tree  */
        this.establish("roster-view", [ View ])

        /*  define presentation model  */ /* =(2)= */
        this.model({
            /*  external model fields  */
            "paramTitle":        { value: "",    valid: "string" },
            "cmdScrollToEnd":    { value: false, valid: "boolean", autoreset: true },
            "dataItems":         { value: [],    valid: "object" },
            "eventItemAdd":      { value: false, valid: "boolean", autoreset: true },
            "eventItemDelete":   { value: null,  valid: "object",  autoreset: true },
            "eventItemSelect":   { value: null,  valid: "object",  autoreset: true },

            /*  internal model fields  */
            "dataItemFilter":    { value: "",    valid: "string" },
            "dataItemsFiltered": { value: [],    valid: "object" },
            "stateItemSelected": { value: null,  valid: "object" }
        })

        /*  determine items to show  */ /* =(3)= */
        this.observe([ "dataItems", "dataItemFilter" ], () => {
            let items  = this.value("dataItems")
            let filter = this.value("dataItemFilter")

            /*  determine filtered items  */
            let itemsFiltered = []
            if (filter === "")
                itemsFiltered = items.slice()
            else {
                items.forEach((item) => {
                    if (minimatch(item.name || "", `*${filter}*`, { nocase: true }))
                        itemsFiltered.push(item)
                })
            }
            this.value("dataItemsFiltered", itemsFiltered)

            /*  determine selected item  */
            let itemSelected = this.value("stateItemSelected")
            if (itemSelected !== null
                && items.filter((item) => item.id === itemSelected.id).length === 0)
                this.value("stateItemSelected", null)
        }, { op: "changed" })

        /*  react on selected item  */
        this.observe("eventItemSelect", (item) => {
            this.value("stateItemSelected", item)
        })
    }
}

