
/*  external imports  */ /* =(1)= */
import gs         from "gemstone"
import deepEqual  from "deep-equal"
import { Client } from "graphql-io-client"
import                 "jquery-resizable-dom"
import                 "typopro-web/web/TypoPRO-SourceSansPro/TypoPRO-SourceSansPro.css"
import                 "font-awesome/css/font-awesome.css"
import Scrollbar  from "perfect-scrollbar"
import                 "perfect-scrollbar/css/perfect-scrollbar.css"
import select2    from "select2/dist/js/select2.full.min.js"
import                 "select2/dist/css/select2.min.css"
import                 "vue-tippy"
import                 "jquery.scrollto"

/*  internal imports  */
import Screen     from "./screen"

/*  integrate Select2 and ComponentJS/ComponentJS-MVC  */ /* =(2)= */
select2(gs.$)
gs.mvc.latch("mask:vue-result", ({ comp, id, mask }) => {
    /*  for each Select2 usage in the masks...  */
    gs.$("select.select2", mask.$el).each((_, el) => {
        /*  figure out the Select2 usage parameters  */
        let model       = gs.$(el).data("model")
        let modelSource = gs.$(el).data("model-source")
        let multiple    = !!(gs.$(el).attr("multiple"))

        /*  observe the ComponentJS model  */
        comp.observe(model, (_, value) => {
            let allowed = comp.value(modelSource)
            if (multiple) {
                /*  sanity check new ComponentJS model value  */
                value.forEach((id) => {
                    if (allowed.findIndex((item) => item.id === id) < 0)
                        throw new Error(`invalid id "${id}" in model field "${model}"`)
                })

                /*   update Select2  */
                if (!deepEqual(gs.$(el).val(), value, { strict: true }))
                    gs.$(el).val(value).trigger("change")
            }
            else {
                /*  sanity check new ComponentJS model value  */
                if (value !== null && allowed.findIndex((item) => item.id === value) < 0)
                    throw new Error(`invalid id "${value}" in model field "${model}"`)

                /*   update Select2  */
                if (value === null)
                    value = ""
                if (gs.$(el).val() !== value)
                    gs.$(el).val(value).trigger("change")
            }
        })

        /*  activate Select2 and update ComponentJS model  */
        gs.$(el)
            .select2({ width: "100%" })
            .on("change", (ev) => {
                let model    = gs.$(ev.target).data("model")
                let multiple = !!(gs.$(ev.target).attr("multiple"))
                let value = gs.$(ev.target).val()
                if (multiple && value.length === 1 && value[0] === "")
                    value = []
                else if (!multiple && value === "")
                    value = null
                if (comp.value(model) !== value)
                    comp.value(model, value)
            })

        /*  woraround: trigger a change to let the placeholder
            occur for "multiple" variants  */
        setTimeout(() => {
            gs.$(el).trigger("change")
        }, 100)
    })
})

/*  integrate PerfectScrollbar  */ /* =(3)= */
gs.mvc.latch("mask:vue-result", ({ comp, id, mask }) => {
    gs.$(".perfect-scrollbar", mask.$el).each((_, el) => {
        setTimeout(() => {
            void (new Scrollbar(el))
        }, 1000)
    })
})

/*  provide GraphQL-IO service client  */ /* =(4)= */
const sv = (url, cid) => {
    let client = new Client({
        url: url.toString().replace(/\/$/, ""),
        encoding: "json",
        compress: true,
        debug:    4
    })
    client.on("debug", ({ log }) => {
        console.log(`[SV]: ${log}`)
    })
    return client
}

/*  boot application via GemstoneJS framework  */ /* =(5)= */
gs.boot({
    app: "unp",
    config: process.config,
    ui: () => [ "screen", Screen, "visible" ],
    sv: sv
})

