(function(global){


    var LeftPanel = React.createClass({

        propTypes:{
            pydio:React.PropTypes.instanceOf(Pydio).isRequired,
            pydioId:React.PropTypes.string.isRequired
        },

        childContextTypes: {
            messages:React.PropTypes.object,
            getMessage:React.PropTypes.func
        },

        getChildContext: function() {
            var messages = this.props.pydio.MessageHash;
            return {
                messages: messages,
                getMessage: function(messageId, namespace='ajxp_admin'){
                    try{
                        return messages[namespace + (namespace?".":"") + messageId] || messageId;
                    }catch(e){
                        return messageId;
                    }
                }
            };
        },

        parseComponentConfigs:function(){
            var reg = this.props.pydio.Registry.getXML();
            var contentNodes = XMLUtils.XPathSelectNodes(reg, 'client_configs/component_config[@className="AjxpReactComponent::'+this.props.pydioId+'"]/additional_content');
            return contentNodes.map(function(node){
                return {
                    id:node.getAttribute('id'),
                    position: parseInt(node.getAttribute('position')),
                    type: node.getAttribute('type'),
                    options: JSON.parse(node.getAttribute('options'))
                };
            });
        },

        getInitialState:function(){
            return {
                statusOpen:true,
                additionalContents:this.parseComponentConfigs(),
                workspaces: this.props.pydio.user.getRepositoriesList()
            };
        },

        componentDidMount:function(){
            if(this._timer) global.clearTimeout(this._timer);
            this._timer = global.setTimeout(this.closeNavigation, 3000);

            this._reloadObserver = function(){
                if(this.isMounted()){
                    this.setState({
                        workspaces:this.props.pydio.user.getRepositoriesList()
                    });
                }
            }.bind(this);

            this.props.pydio.observe('repository_list_refreshed', this._reloadObserver);
        },

        componentWillUnmount:function(){
            if(this._reloadObserver){
                this.props.pydio.stopObserving('repository_list_refreshed', this._reloadObserver);
            }
        },

        openNavigation:function(){
            if(!this.state.statusOpen){
                this.setState({statusOpen:true});
            }
        },

        closeNavigation:function(){
            this.setState({statusOpen:false});
        },

        listNodeClicked:function(node){
            this.props.pydio.goTo(node);
            this.closeNavigation();
        },

        closeMouseover:function(){
            if(this._timer) global.clearTimeout(this._timer);
        },

        closeMouseout:function(){
            if(this._timer) global.clearTimeout(this._timer);
            this._timer = global.setTimeout(this.closeNavigation, 300);
        },

        render:function(){

            const additional = this.state.additionalContents.map(function(paneData){
                if(paneData.type == 'ListProvider'){
                    return (
                        <CollapsableListProvider
                            pydio={this.props.pydio}
                            paneData={paneData}
                            nodeClicked={this.listNodeClicked}
                        />
                    );
                }else{
                    return null;
                }
            }.bind(this));

            return (
                <span>
                    <div  id="repo_chooser" onClick={this.openNavigation} onMouseOver={this.openNavigation} className={this.state.statusOpen?"open":""}>
                        <span className="icon-reorder"/>
                    </div>
                    <div className={"left-panel" + (this.state.statusOpen?'':' hidden')} onMouseOver={this.closeMouseover} onMouseOut={this.closeMouseout}>
                        {additional}
                        <UserWorkspacesList
                            pydio={this.props.pydio}
                            workspaces={this.state.workspaces}
                        />
                    </div>
                </span>
            );
        }
    });

    var CollapsableListProvider = React.createClass({

        propTypes:{
            paneData:React.PropTypes.object,
            pydio:React.PropTypes.instanceOf(Pydio),
            nodeClicked:React.PropTypes.func
        },

        getInitialState:function(){
            return {open:false, componentLaunched:false};
        },

        toggleOpen:function(){
            this.setState({open:!this.state.open, componentLaunched:true});
        },

        render:function(){

            var messages = this.props.pydio.MessageHash;
            var paneData = this.props.paneData;

            const title = messages[paneData.options.title] || paneData.options.title;
            const className = 'simple-provider ' + (paneData.options['className'] ? paneData.options['className'] : '');
            const titleClassName = 'section-title ' + (paneData.options['titleClassName'] ? paneData.options['titleClassName'] : '');

            var component;
            if(this.state.componentLaunched){
                component = (
                    <ReactPydio.NodeListCustomProvider
                        pydio={this.props.pydio}
                        ref={paneData.id}
                        title={title}
                        elementHeight={36}
                        heightAutoWithMax={400}
                        nodeClicked={this.props.nodeClicked}
                        nodeProviderProperties={paneData.options['nodeProviderProperties']}
                        reloadOnServerMessage={paneData.options['reloadOnServerMessage']}
                        actionBarGroups={[]}
                    />
                );
            }

            return (
                <div className={className + (this.state.open?" open": " closed")}>
                    <div className={titleClassName}>
                        <span className="toggle-button" onClick={this.toggleOpen}>{this.state.open?messages[514]:messages[513]}</span>
                        {title}
                    </div>
                    {component}
                </div>
            );

        }

    });

    var UserWorkspacesList = React.createClass({

        propTypes:{
            pydio:React.PropTypes.instanceOf(Pydio),
            workspaces:React.PropTypes.instanceOf(Map),
            onHoverLink:React.PropTypes.func,
            onOutLink:React.PropTypes.func
        },

        createRepositoryEnabled:function(){
            var reg = this.props.pydio.Registry.getXML();
            return XMLUtils.XPathSelectSingleNode(reg, 'actions/action[@name="user_create_repository"]') !== null;
        },

        render: function(){
            var entries = [], sharedEntries = [], inboxEntry;

            this.props.workspaces.forEach(function(object, key){
                if(object.getId().indexOf('ajxp_') === 0){
                    return;
                }
                if(object.hasContentFilter()){
                    return;
                }
                var entry = (
                    <WorkspaceEntry
                        {...this.props}
                        key={key}
                        workspace={object}
                    />
                );
                if (object.getAccessType() == "inbox") {
                    inboxEntry = entry;
                } else if(object.getOwner()) {
                    sharedEntries.push(entry);
                } else {
                    entries.push(entry);
                }
            }.bind(this));

            if(inboxEntry){
                sharedEntries.unshift(inboxEntry);
            }

            var messages = this.props.pydio.MessageHash;

            if(this.createRepositoryEnabled()){
                var createClick = function(){
                    this.props.pydio.Controller.fireAction('user_create_repository');
                }.bind(this);
                var createAction = (
                    <div className="workspaces">
                        <div className="workspace-entry" onClick={createClick} title={messages[418]}>
                            <span className="workspace-badge">+</span>
                            <span className="workspace-label">{messages[417]}</span>
                        </div>
                    </div>
                );
            }

            return (
                <div>
                    <div className="section-title">{messages[468]}</div>
                    <div className="workspaces">
                        {entries}
                    </div>
                    <div className="section-title">{messages[469]}</div>
                    <div className="workspaces">
                        {sharedEntries}
                    </div>
                    <div className="section-title"></div>
                    {createAction}
                </div>
            );

        }

    });

    var WorkspaceEntry = React.createClass({

        mixins:[ReactPydio.MessagesConsumerMixin],

        propTypes:{
            pydio:React.PropTypes.instanceOf(Pydio).isRequired,
            workspace:React.PropTypes.instanceOf(Repository).isRequired,
            onHoverLink:React.PropTypes.func,
            onOutLink:React.PropTypes.func
        },

        getInitialState:function(){
            return {openAlert:false};
        },

        getLetterBadge:function(){
            return {__html:this.props.workspace.getHtmlBadge(true)};
        },

        handleAccept: function () {
            PydioApi.getClient().request({
                'get_action': 'accept_invitation',
                'remote_share_id': this.props.workspace.getShareId()
            }, this.handleCloseAlert.bind(this), this.handleCloseAlert.bind(this));
        },

        handleDecline: function () {
            PydioApi.getClient().request({
                'get_action': 'reject_invitation',
                'remote_share_id': this.props.workspace.getShareId()
            }, this.handleCloseAlert.bind(this), this.handleCloseAlert.bind(this));
        },

        handleOpenAlert: function () {
            this.refs.dialog.show();
        },

        handleCloseAlert: function() {
            this.refs.dialog.dismiss();
        },

        onClick:function(){
            this.props.pydio.triggerRepositoryChange(this.props.workspace.getId());
        },

        render:function(){
            var current = this.props.pydio.user.getActiveRepository();
            var currentClass="workspace-entry";
            if(current == this.props.workspace.getId()){
                currentClass +=" workspace-current";
            }
            currentClass += " workspace-access-" + this.props.workspace.getAccessType();
            if(this.props.onHoverLink){
                var onHover = function(event){
                    this.props.onHoverLink(event, this.props.workspace)
                }.bind(this);
            }
            if(this.props.onOutLink){
                var onOut = function(event){this.props.onOutLink(event, this.props.ws)}.bind(this);
            }
            var onClick = this.onClick.bind(this);

            // Icons
            var badge;
            if(this.props.workspace.getAccessType() == "inbox"){
                badge = <span className="workspace-badge"><span className="access-icon"/></span>;
            }else{
                badge = <span className="workspace-badge" dangerouslySetInnerHTML={this.getLetterBadge()}/>;
            }
            var remote, remoteDialog;
            if (this.props.workspace.getRepositoryType() == "remote"){
                var actions = [
                    { text: 'Decline', ref: 'decline', onClick: this.handleDecline.bind(this)},
                    { text: 'Accept', ref: 'accept', onClick: this.handleAccept.bind(this)}
                ];

                onClick = this.handleOpenAlert.bind(this);

                remote = <span className="icon-cloud"></span>;

                remoteDialog = <div className='react-mui-context'>
                    <ReactMUI.Dialog
                        title="Remote File Dialog"
                        ref="dialog"
                        actions={actions}
                        modal={false}
                        dismissOnClickAway={true}
                    >
                        This item has been share with you from a remote location.

                        Do you want to accept it ?
                    </ReactMUI.Dialog>
                </div>
            }

            var newWorkspace;
            /*if (this.props.workspace.getFirstAccess() === ""){
                newWorkspace = <span className="workspace-new"><span className="new-icon"/></span>;
            }*/

            return (
                <div
                    className={currentClass}
                    onClick={onClick}
                    title={this.props.workspace.getDescription()}
                    onMouseOver={onHover}
                    onMouseOut={onOut}
                >
                    {badge}
                    <span className="workspace-label">{this.props.workspace.getLabel()}</span>
                    <span className="workspace-description">{this.props.workspace.getDescription()}</span>
                    {remote}
                    {remoteDialog}
                    {newWorkspace}
                </div>
            );
        }

    });

    var ns = global.LeftNavigation || {};
    if(global.ReactDND){
        ns.Panel = ReactDND.DragDropContext(ReactDND.HTML5Backend)(LeftPanel);
    }else{
        ns.Panel = LeftPanel;
    }
    ns.UserWorkspacesList = UserWorkspacesList;
    global.LeftNavigation=ns;

})(window);