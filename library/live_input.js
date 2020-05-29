import React, {useState, useEffect} from 'react'
const RSIperiodtest = (props) => {

    const [RSIp, setRSIp] = useState(props.placeholder ? props.placeholder : 14);

    const onChange = (e) => {
        setRSIp(e.currentTarget.value)
    }

    return(
        <div className="search-bar">
            <input type="text" placeholder={props.placeholder} onChange={onChange}/>
        </div>
    )
}
export default RSIperiodtest()