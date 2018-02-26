
import deepEqual from "deep-equal"

export class Bridge {
    constructor (fields) {
        this.fields = fields
    }
    bm2pm (entity, comp) {
        if (entity === null || comp === null)
            return
        this.fields.forEach((field) => {
            if (field.type === "attr") {
                let value = entity[field.bm]
                if (comp.value(field.pm) !== value)
                    comp.value(field.pm, value)
            }
            else if (field.type === "rel?") {
                let value = entity[field.bm] !== null ?
                    entity[field.bm].id : null
                if (comp.value(field.pm) !== value)
                    comp.value(field.pm, value)
            }
            else if (field.type === "rel*") {
                let value = entity[field.bm].map((entity) => entity.id)
                if (!deepEqual(comp.value(field.pm), value))
                    comp.value(field.pm, value)
            }
        })
    }
    pm2bm (comp, entity) {
        let changeset = {}
        if (entity === null || comp === null)
            return changeset
        this.fields.forEach((field) => {
            let value = comp.value(field.pm)
            if (field.type === "attr") {
                if (entity[field.bm] === value)
                    return
                entity[field.bm] = value
                changeset[field.bm] = value
            }
            else if (field.type === "rel?") {
                if (   (entity[field.bm] === null && value === null)
                    || (entity[field.bm] !== null && entity[field.bm].id === value))
                    return
                entity[field.bm] = { id: value }
                changeset[field.bm] = { set: value === null ? [] : [ value ] }
            }
            else if (field.type === "rel*") {
                let oldSet = entity[field.bm].map((x) => x.id)
                let newSet = value
                if (deepEqual(oldSet, newSet))
                    return
                let delSet = oldSet.filter((id) => newSet.indexOf(id) < 0)
                let addSet = newSet.filter((id) => oldSet.indexOf(id) < 0)
                entity[field.bm] = value.map((id) => ({ id: id }))
                changeset[field.bm] = {}
                if (delSet.length > 0) changeset[field.bm].del = delSet
                if (addSet.length > 0) changeset[field.bm].add = addSet
            }
        })
        return changeset
    }
}

