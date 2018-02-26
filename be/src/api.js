
import GTS from "graphql-tools-sequelize"

export default class {
    get module () {
        return { name: "api", group: "APP", after: "db" }
    }
    latch (mk) {
        /*  provide "frontend" configuration option  */
        mk.latch("options:options", (options) => {
            options.push({
                names: [ "frontend" ], type: "string", "default": ".",
                help: "path to frontend data"
            })
        })
    }
    async prepare (mk) {
        /*  establish GraphQL/Sequelize bridge  */
        let db = mk.rs("db")
        let gts = new GTS(db, {
            validator:  null,
            authorizer: null,
            tracer: async (type, oid, obj, op, via, onto, ctx) => {
                if (ctx.scope !== null)
                    ctx.scope.record(type, oid, op, via, onto)
            },
            fts: {
                "Unit":   [ "name" ],
                "Person": [ "name" ]
            }
        })
        mk.rs("gts", gts)
        await gts.boot()

        /*  hook into GraphQL-IO for dynamic configuration  */
        mk.rs("graphqlio").at("server-configure", (options) => {
            options.set({
                prefix:   "UnP-",
                name:     "UnP",
                frontend: mk.rs("options:options").frontend,
                secret:   mk.rs("options:options").secret,
                graphiql: true,
                debug:    9,
                example:
                    "query {\n" +
                    "    Units {\n" +
                    "        abbreviation name\n" +
                    "        director   { initials name role }\n" +
                    "        members    { initials name role }\n" +
                    "        parentUnit { abbreviation name }\n"+
                    "    }\n" +
                    "}\n"
            })
        })

        /*  hook into GraphQL-IO for providing transaction  */
        mk.rs("graphqlio").at("graphql-transaction", (ctx) => {
            return (cb) => {
                /*  wrap GraphQL operation into a database transaction  */
                return db.transaction({
                    autocommit:     false,
                    deferrable:     true,
                    type:           db.Transaction.TYPES.DEFERRED,
                    isolationLevel: db.Transaction.ISOLATION_LEVELS.SERIALIZABLE
                }, (tx) => cb(tx))
            }
        })

        /*  provide GraphQL schema definition  */
        mk.rs("graphqlio").at("graphql-schema", () => `
            type Root {
                ${gts.entityQuerySchema("Root", "", "Unit")}
                ${gts.entityQuerySchema("Root", "", "Unit*")}
                ${gts.entityQuerySchema("Root", "", "Person")}
                ${gts.entityQuerySchema("Root", "", "Person*")}
            }
            type Unit {
                id:           UUID!
                name:         String
                abbreviation: String
                ${gts.entityQuerySchema ("Unit", "director",   "Person")}
                ${gts.entityQuerySchema ("Unit", "members",    "Person*")}
                ${gts.entityQuerySchema ("Unit", "parentUnit", "Unit")}
                ${gts.entityCreateSchema("Unit")}
                ${gts.entityCloneSchema ("Unit")}
                ${gts.entityUpdateSchema("Unit")}
                ${gts.entityDeleteSchema("Unit")}
            }
            type Person {
                id:           UUID!
                name:         String
                initials:     String
                role:         String
                ${gts.entityQuerySchema ("Person", "belongsTo",  "Unit")}
                ${gts.entityQuerySchema ("Person", "supervisor", "Person")}
                ${gts.entityCreateSchema("Person")}
                ${gts.entityCloneSchema ("Person")}
                ${gts.entityUpdateSchema("Person")}
                ${gts.entityDeleteSchema("Person")}
            }
        `)

        /*  provide GraphQL schema resolver  */
        mk.rs("graphqlio").at("graphql-resolver", () => ({
            Root: {
                Unit:       gts.entityQueryResolver  ("Root", "", "Unit"),
                Units:      gts.entityQueryResolver  ("Root", "", "Unit*"),
                Person:     gts.entityQueryResolver  ("Root", "", "Person"),
                Persons:    gts.entityQueryResolver  ("Root", "", "Person*")
            },
            Unit: {
                director:   gts.entityQueryResolver  ("Unit", "director",
                                                      "Person"),
                members:    gts.entityQueryResolver  ("Unit", "members",
                                                      "Person*"),
                parentUnit: gts.entityQueryResolver  ("Unit", "parentUnit",
                                                      "Unit"),
                create:     gts.entityCreateResolver ("Unit"),
                clone:      gts.entityCloneResolver  ("Unit"),
                update:     gts.entityUpdateResolver ("Unit"),
                delete:     gts.entityDeleteResolver ("Unit")
            },
            Person: {
                belongsTo:  gts.entityQueryResolver  ("Person", "belongsTo",
                                                      "Unit"),
                supervisor: gts.entityQueryResolver  ("Person", "supervisor",
                                                      "Person"),
                create:     gts.entityCreateResolver ("Person"),
                clone:      gts.entityCloneResolver  ("Person"),
                update:     gts.entityUpdateResolver ("Person"),
                delete:     gts.entityDeleteResolver ("Person")
            }
        }))
    }
}
