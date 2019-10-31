if(!Object.prototype.prepareData){
    Object.prototype.prepareData = function(){
        const $this = this
        const columns = Object.keys($this)
        const values = columns.map(column => { return (typeof $this[column]) === 'boolean' ? $this[column] : $this[column] ? `'${$this[column]}'`.replace(/\\/,'') : 'null'})
        return [columns,values]
    }
}

