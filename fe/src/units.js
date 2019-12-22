
/*  external imports  */
import { mvc, vue, i18next } from "gemstone"

/*  internal imports  */
import Roster                from "./roster.js"
import i18n                  from "./units.yaml"

/*  MVC/CT Controller  */
export default class Controller extends mvc.Controller {
    create () {
        this.establish("units-roster", [ Roster ]) /* =(1)= */
    }
    prepare () {
        /*  provide translated roster title  */
        i18next.addResourceBundles("units", i18n)
        this.observe("gsLang", () => {
            this.value("paramTitle", vue.t("units:units"))
        }, { boot: true })

        /*  subscribe to all items via service  */
        const subscription = this.sv().query(`{
            Units { id name }
        }`).subscribe((result) => { /* =(2)= */
            if (result && result.data && result.data.Units)
                this.value("dataItems", result.data.Units)
        })
        this.spool(() => subscription.unsubscribe())

        /*  attach to the roster events  */
        this.observe("eventItemAdd", async () => {
            /*  add item via service  */
            const result = await this.sv().mutation(`{
                Unit { create { id name } }
            }`)

            /*  add item in user interface  */
            const unit = result.data.Unit.create
            const items = this.value("dataItems")
            items.push(unit)
            this.touch("dataItems")
            this.value("cmdScrollToEnd", true)

            /*  notify sibling dialogs  */
            this.publish("unit-add",    unit.id)
            this.publish("unit-select", unit.id)
        })
        this.observe("eventItemDelete", async (item) => {
            /*  delete item via service  */
            await this.sv().mutation(`($id: UUID!) {
                Unit (id: $id) { delete }
            }`, { id: item.id })

            /*  delete item in user interface  */
            let items = this.value("dataItems")
            items = items.filter((x) => x.id !== item.id)
            this.value("dataItems", items)

            /*  notify sibling dialogs  */
            this.publish("unit-select", "")
            this.publish("unit-delete", item.id)
        })
        this.observe("eventItemSelect", (item) => {
            /*  notify sibling dialogs  */
            this.publish("unit-select", item.id)
        })
    }
}

