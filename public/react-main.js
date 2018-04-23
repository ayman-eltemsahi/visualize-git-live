class GitTree extends React.Component {

    constructor(props) {
        super(props);

        this.onChange = this.onChange.bind(this);

        let visible = JSON.parse(localStorage.getItem('visible'));
        if (!visible) {
            visible = {
                blob    :  false ,
                tree    :  false ,
                commit  :  true  ,
                branch  :  true  ,
                head    :  true 
            };
        }

        this.state = {
            visible
        };

        getTree(visible);
    }

    onChange(visible) {
        this.setState({ visible });
        console.log(this.state.visible);

        localStorage.setItem('visible', JSON.stringify(this.state.visible));

        showHideType(this.state.visible);
    }

    render() {
        let reachableLevelLimit = 1 << 30, notReachableLevelLimit = 1 << 30;
        let showReachableWithLevel = () => showReachable( reachableLevelLimit    );
        let showWhoReachWithLevel  = () => showWhoReach ( notReachableLevelLimit );

        return (
            <div >
                <Checkboxes visible={this.state.visible} change={this.onChange} />

                <div className='container'>
                    <div className='btns row'>
                        <div className='col-md-6'>
                            <div className='col-md-4'>
                                <button className='btn btn-sm btn-success' onClick={showReachable}>Show reachable from selected</button>
                            </div>
                            <div className='col-md-8'>
                                <button className='btn btn-sm btn-success' onClick={showReachableWithLevel}>Limit level </button>
                                <input type="number" className='form-control input-sm' style={{ width: '100px', display: 'inline-block' }} onChange={e => reachableLevelLimit = e.target.value} />
                            </div>
                            <br />

                            <div className='col-md-4'>
                                <button className='btn btn-sm btn-success' onClick={showWhoReach}>Show who reach selected</button>
                            </div>
                            <div className='col-md-8'>
                                <button className='btn btn-sm btn-success' onClick={showWhoReachWithLevel}>Limit level </button>
                                <input type="number" className='form-control input-sm' style={{ width: '100px', display: 'inline-block' }} onChange={e => notReachableLevelLimit = e.target.value} />
                            </div>
                        </div>

                        <div className='col-md-4'>

                            <button className='btn btn-sm btn-success' onClick={showNotReachable} >Show not reachable from selected</button>

                            <button className='btn btn-sm btn-success' onClick={showNotWhoReach} >Show who don't reach selected</button>
                        </div>

                        <div className='col-md-2'>

                            <button className='btn btn-sm btn-success' onClick={showAll} >Show All</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

const Checkboxes = ({ visible, change }) => {
    let onChange = (type, checked) => {
        visible[type] = checked;
        change(visible);
    };

    return (
        <div>
            <Checkbox label = "blob"     checked={ visible.blob   }    change = {onChange} />
            <Checkbox label = "tree"     checked={ visible.tree   }    change = {onChange} />
            <Checkbox label = "commit"   checked={ visible.commit }    change = {onChange} />
            <Checkbox label = "branch"   checked={ visible.branch }    change = {onChange} />
            <Checkbox label = "head"     checked={ visible.head   }    change = {onChange} />
        </div>
    )
}

const Checkbox = ({ change, label, checked }) => (
    <div className="checkbox" style={{ marginTop: '5px' }}>
        <label>
            <input type="checkbox" value={label} checked={checked} onChange={() => change(label, !checked)} />
            {label}
        </label>
    </div>
);

ReactDOM.render(
    <GitTree />,
    document.getElementsByClassName('left-panel')[0]
);