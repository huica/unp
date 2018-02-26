
/*  external imports  */
import { mvc, vue, i18next } from "gemstone"

/*  internal imports  */
import Roster                from "./roster.js"
import i18n                  from "./persons.yaml"

/*  MVC/CT Controller  */
export default class Controller extends mvc.Controller {
    create () {
        this.establish("persons-roster", [ Roster ])
    }
    prepare () {
        /*  provide translated roster title  */
        i18next.addResourceBundles("persons", i18n)
        this.observe("gsLang", () => {
            this.value("paramTitle", vue.t("persons:persons"))
        }, { boot: true })

        /*  subscribe to all items via service  */
        let subscription = this.sv().query(`{
            Persons { id name }
        }`).subscribe((result) => {
            if (result && result.data && result.data.Persons)
                this.value("dataItems", result.data.Persons)
        })
        this.spool(() => subscription.unsubscribe())

        /*  attach to the roster events  */
        this.observe("eventItemAdd", async () => {
            /*  add item via service  */
            let result = await this.sv().mutation(`{
                Person { create { id name } }
            }`)

            /*  add item in user interface  */
            let person = result.data.Person.create
            let items = this.value("dataItems")
            items.push(person)
            this.touch("dataItems")
            this.value("cmdScrollToEnd", true)

            /*  notify siblig dialogs  */
            this.publish("person-add",    person.id)
            this.publish("person-select", person.id)
        })
        this.observe("eventItemDelete", async (item) => {
            /*  delete item via service  */
            await this.sv().mutation(`($id: UUID!) {
                Person (id: $id) { delete }
            }`, { id: item.id })

            /*  delete item in user interface  */
            let items = this.value("dataItems")
            items = items.filter((x) => x.id !== item.id)
            this.value("dataItems", items)

            /*  notify sibling dialogs  */
            this.publish("person-select", "")
            this.publish("person-delete", item.id)
        })
        this.observe("eventItemSelect", (item) => {
            /*  notify sibling dialogs  */
            this.publish("person-select", item.id)
        })
    }
}

