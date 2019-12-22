
import deepEqual from "deep-equal"

export class Bridge {
    constructor (fields) {
        this.fields = fields
    }
    bm2pm (entity, comp) { /* =(1)= */
        if (entity === null || comp === null)
            return
        this.fields.forEach((field) => {
            if (field.type === "attr") {
                const value = entity[field.bm]
                if (comp.value(field.pm) !== value)
                    comp.value(field.pm, value)
            }
            else if (field.type === "rel?") {
                const value = entity[field.bm] !== null ?
                    entity[field.bm].id : null
                if (comp.value(field.pm) !== value)
                    comp.value(field.pm, value)
            }
            else if (field.type === "rel*") {
                const value = entity[field.bm].map((entity) => entity.id)
                if (!deepEqual(comp.value(field.pm), value))
                    comp.value(field.pm, value)
            }
        })
    }
    pm2bm (comp, entity) { /* =(2)= */
        const changeset = {}
        if (entity === null || comp === null)
            return changeset
        this.fields.forEach((field) => {
            const value = comp.value(field.pm)
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
                const oldSet = entity[field.bm].map((x) => x.id)
                const newSet = value
                if (deepEqual(oldSet, newSet))
                    return
                const delSet = oldSet.filter((id) => newSet.indexOf(id) < 0)
                const addSet = newSet.filter((id) => oldSet.indexOf(id) < 0)
                entity[field.bm] = value.map((id) => ({ id: id }))
                changeset[field.bm] = {}
                if (delSet.length > 0) changeset[field.bm].del = delSet
                if (addSet.length > 0) changeset[field.bm].add = addSet
            }
        })
        return changeset
    }
}

