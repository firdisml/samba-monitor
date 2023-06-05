export const comparer = (products,TheProduct)=> {
    let find= false;
    let diff=[]
    for (let index = 0; index < products.length; index++) {
        const element = products[index];
        for (let idx = 0; idx < TheProduct.length; idx++) {
            const ele = TheProduct[idx];
            if ( element.product_name == ele.product_name && element.link == ele.link){
                find=true;
            }
        }
        if (!find)
            diff.push(element)
        else
            find = false
    }
    return diff;
}
