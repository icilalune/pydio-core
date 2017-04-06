const React = require('react');
const PathUtils = require('pydio/util/path')
import ShareContextConsumer from '../ShareContextConsumer'

let HeaderPanel = React.createClass({

    render: function(){

        let nodePath = this.props.shareModel.getNode().getPath();
        /*
         if(this.props.shareModel.getNode().getMetadata().get("original_path")){
         nodePath = this.props.shareModel.getNode().getMetadata().get("original_path");
         }
         */
        if(this.props.noModal){
            return (
                <div  className="headerPanel" style={{padding: 0, width:'100%', height: 27}}></div>
            );
        }
        return (
            <div className="headerPanel">
                <div>{this.props.getMessage('44').replace('%s', PathUtils.getBasename(nodePath))}</div>
            </div>
        );
    }
});

HeaderPanel = ShareContextConsumer(HeaderPanel);
export {HeaderPanel as default}