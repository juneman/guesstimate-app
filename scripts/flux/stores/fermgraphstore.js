var React = require('react');
var Reflux = require('reflux');
var FermActions = require('../actions');
var _ = require('../../lodash.min');

var NodeCollection = require('../../nodecollection');
var EdgeCollection = require('../../edgecollection');

class Egraph {
  constructor(args){
    this.nodes = new NodeCollection(args.nodes, this);
    this.edges = new EdgeCollection(args.edges, this);
  }
  outsideNodes(node){
    var insideNodes = _.union(node, node.allOutputs())
    return _.difference(this.nodes.models, insideNodes)
  }
}
var todoCounter = 1,
    localStorageKey = "fermi";

var fermGraphStore = Reflux.createStore({
    listenables: [FermActions],
    getNodes: function() {
        return this.list;
    },
    addEstimate: function() {
        var newNode = {
            id: todoCounter++,
            created: new Date(),
            name: '',
            value: '',
            type: 'estimate'
        };
        FermActions.updateEditingNode(newNode.id)
    },
    addFunction: function() {
        var newResult = {
            id: todoCounter++,
            created: new Date(),
            name: '',
            value: '',
            type: 'result'
        };
        var newFun = {
            id: todoCounter++,
            created: new Date(),
            function: 'addition',
            type: 'function',
            output: newResult.id
        };
        //this.updateNodes([newResult, newFun].concat(this.list));
        this.updateGraph()
        FermActions.updateEditingNode(newResult)
    },
    onAddNode: function(type) {
        if (type=="estimate"){
            this.addEstimate();
        } else {
            this.addFunction();
        }
    },
    onUpdateNodes: function(list){
        _.map(list, function(n){this._onUpdateNode(n.id, n)}, this)
        this.updateGraph();
    },
    onUpdateNode: function(nodeId, newValues) {
        this._onUpdateNode(nodeId, newValues)
        this.updateGraph();
    },
    updateGraph: function(graph) {
        //localStorage.setNode(localStorageKey, JSON.stringify(list));
        this.trigger(this.graph);
    },
    _onUpdateNode: function(nodeId, newValues){
        var node = this.getNode(parseInt(nodeId));
        if (!node) {
            return;
        };
        node.set(newValues)
    },
    onRemoveNode: function(nodeId) {
        var newNodes = (_.filter(this.list,function(node){
            return node.id!==nodeId;
        }));
        this.updateGraph()
        FermActions.resetEditingNode()
    },
    getNode: function(nodeId){
      return this.graph.nodes.get(nodeId)
    },
    getNodes: function(){
        return this.list;
    },
    getInitialState: function() {

      var data = {
        nodes: [
          {pid: 2, nodeType: 'estimate', name: 'people in the Europe', value: 10},
          {pid: 3, nodeType: 'estimate', name: 'people in the US', value: 10},
          {pid: 4, nodeType: 'function', functionType: 'addition'},
          {pid: 5, nodeType: 'dependent', name: 'people in World'},
          {pid: 6, nodeType: 'function', functionType: 'multiplication'},
          {pid: 7, nodeType: 'dependent', name: 'people in Universe'},
          {pid: 8, nodeType: 'estimate', name: 'universe/person ratio', value: 200},
          {pid: 9, nodeType: 'estimate', name: 'other thing', value: 2}
        ],
        edges: [
          [2,4],
          [3,4],
          [4,5],
          [5,6],
          [6,7],
          [8,6],
          [6,9]
        ]
      };
      this.graph = new Egraph(data);

      // var loadedNodes = localStorage.getNode(localStorageKey);
      // if (!loadedNodes) {
      //     // If no list is in localstorage, start out with a default one
      //     this.list = [
      //         {
      //             id: todoCounter++,
      //             created: new Date(),
      //             name: 'first node',
      //             mean: 0,
      //             type: 'estimate'
      //         },
      //         {
      //             id: todoCounter++,
      //             created: new Date(),
      //             name: 'second node',
      //             mean: 0,
      //             type: 'estimate'
      //         }
      //     ];
      // } else {
      //     this.list = JSON.parse(loadedNodes);
      //     todoCounter = parseInt(_.max(this.list, 'id').id) + 1
      // }
      // return this.list;
          return this.graph;
    }
})

module.exports = fermGraphStore;