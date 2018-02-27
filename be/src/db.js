
import Sequelize from "sequelize"
import UUID      from "pure-uuid"
import Chance    from "chance"

export default class {
    get module () {
        return { name: "db", group: "APP" }
    }
    latch (mk) {
        mk.latch("sequelize:ddl", async (db, dm) => {
            /*  define data model  */
            dm.Unit = db.define("Unit", {
                id:           { type: Sequelize.STRING(36), primaryKey: true },
                name:         { type: Sequelize.STRING(100), allowNull: true },
                abbreviation: { type: Sequelize.STRING(10), allowNull: true }
            })
            dm.Person = db.define("Person", {
                id:           { type: Sequelize.STRING(36), primaryKey: true },
                name:         { type: Sequelize.STRING(100), allowNull: true },
                initials:     { type: Sequelize.STRING(10), allowNull: true },
                role:         { type: Sequelize.STRING(100), allowNull: true }
            })
            dm.Unit  .belongsTo(dm.Unit,   { as:         "parentUnit",
                                             foreignKey: "parentUnitId" })
            dm.Unit  .hasMany  (dm.Person, { as:         "members",
                                             foreignKey: "unitId" })
            dm.Unit  .hasOne   (dm.Person, { as:         "director",
                                             foreignKey: "directorId" })
            dm.Person.belongsTo(dm.Person, { as:         "supervisor",
                                             foreignKey: "personId" })
            dm.Person.belongsTo(dm.Unit,   { as:         "belongsTo",
                                             foreignKey: "unitId" })

            /*  synchronize data model with underlying RDBMS  */
            await db.sync({ force: true })

            /*  fill data model with some initial data records
                (all fully deterministically generated)  */
            let units   = {}
            let persons = {}
            const uuid = (id) => (new UUID(5, "ns:URL", `uri:${id}`)).format()
            const unit = async (id, name, parentUnit) => {
                let unit = await dm.Unit.create({
                    id: uuid(`unit:${id}`), name: name, abbreviation: id })
                if (parentUnit) await unit.setParentUnit(parentUnit)
                units[id] = unit
                return unit
            }
            const person = async (id, name, role, unit, supervisor) => {
                let person = await dm.Person.create({
                    id: uuid(`person:${id}`), name: name,
                    initials: id, role: role })
                if (unit)       await person.setBelongsTo(unit)
                if (supervisor) await person.setSupervisor(supervisor)
                persons[id] = person
                return person
            }
            await unit("EC",  "Example Corporation")
            await unit("MA",  "Management & Administration",         units.EC)
            await unit("EP",  "Engineering & Production",            units.EC)
            await unit("RD",  "Research & Development",              units.EC)
            await unit("RDT", "Research & Development: Training",    units.RD)
            await unit("RDI", "Research & Development: Innovation",  units.RD)
            await unit("RDE", "Research & Development: Elaboration", units.RD)
            await unit("RDP", "Research & Development: Publication", units.RD)
            await person("BB", "Berry Boss", "Director", units.EC)
            units.EC.setDirector(persons.BB)
            let roles = [
                "Assistent", "Trainee", "Engineer", "Architect", "Consultant"
            ]
            let allInitials = []
            let chance = new Chance("UnP")
            const makeNameAndInitials = () => {
                let name, initials
                while (true) {
                    name = chance.name()
                    let m = name.match(/^([A-Z]).+?\s+([A-Z]).+/)
                    if (m === null)
                        continue
                    initials = `${m[1]}${m[2]}`
                    if (allInitials.indexOf(initials) >= 0)
                        continue
                    allInitials.push(initials)
                    break
                }
                return { name, initials }
            }
            let ids = Object.keys(units)
            for (let i = 0; i < ids.length; i++) {
                let p = []
                for (let j = 0; j < 2; j++) {
                    let { name, initials } = makeNameAndInitials()
                    if (j === 0) {
                        p[j] = await person(initials, name, "Manager",
                            units[ids[i]], persons.BB)
                        units[ids[i]].setDirector(p[j])
                    }
                    else
                        p[j] = await person(initials, name,
                            roles[j % roles.length], units[ids[i]], p[0])
                }
            }
        })
    }
}

