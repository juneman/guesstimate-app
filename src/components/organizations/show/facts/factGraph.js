import React, {Component} from 'react'

import {FactItem} from 'gComponents/facts/list/item.js'
import FlowGrid from 'gComponents/lib/FlowGrid/FlowGrid'
import SpaceListItem from 'gComponents/spaces/list_item/index.js'
import {SpaceCard, NewSpaceCard} from 'gComponents/spaces/cards'

import * as _collections from 'gEngine/collections'
import * as _utils from 'gEngine/utils'
import * as _space from 'gEngine/space'

import {separateIntoDisconnectedComponents, separateIntoHeightSets} from 'lib/DAG/DAG'
import {getNodeAncestors, getMissingInputs} from 'lib/DAG/nodeFns'

import './style.css'

const idToNodeId = (id, isFact) => `${isFact ? 'fact' : 'space'}:${id}`
const spaceIdToNodeId = ({id}) => idToNodeId(id, false)
const factIdToNodeId = ({id}) => idToNodeId(id, true)

const makeFactNodeFn = spaces => fact => ({
  key: factIdToNodeId(fact),
  id: factIdToNodeId(fact),
  outputs: spaces.filter(s => _utils.orArr(s.imported_fact_ids).includes(fact.id)).map(spaceIdToNodeId),
  inputs: !!fact.exported_from_id ? [idToNodeId(fact.exported_from_id, false)] : [],
  component: <FactItem fact={fact} size={'SMALL'}/>,
})
const makeSpaceNodeFn = facts => s => ({
  key: spaceIdToNodeId(s),
  id: spaceIdToNodeId(s),
  inputs: s.imported_fact_ids.map(id => idToNodeId(id, true)),
  outputs: _collections.filter(facts, s.id, 'exported_from_id').map(factIdToNodeId),
  component:  <SpaceCard size={'SMALL'} key={s.id} space={s} urlParams={{factsShown: 'true'}}/>
})

const addLocationsToHeightOrderedComponents = componentsHeightOrdered => {
  let withFinalLocations = []
  let maxRowUsed = 0
  componentsHeightOrdered.forEach(heightOrderedComponent => {
    let sortedHeightOrderedNodes = []
    let currColumn = 0
    let maxRowUsedInComponent = maxRowUsed
    heightOrderedComponent.forEach(heightSet => {
      const prevLayer = _utils.orArr(_.last(sortedHeightOrderedNodes))
      let newLayer = _utils.mutableCopy(heightSet)
      let newLayerOrdered = []
      prevLayer.filter(n => !_.isEmpty(n.outputs)).forEach(n => {
        const outputs = _.remove(newLayer, ({id}) => n.outputs.includes(id))
        const outputsSorted = _.sortBy(outputs, c => -c.outputs.length)
        newLayerOrdered.push(...outputsSorted)
      })
      const restSorted = _.sortBy(newLayer, n => -n.outputs.length)
      newLayerOrdered.push(...restSorted)

      let currRow = maxRowUsed
      const withLocations = _.map(newLayerOrdered, node => {
        const withLocation = {
          ...node,
          location: {row: currRow, column: currColumn},
        }
        if (node.outputs.length > 3) {
          currRow += 2
        } else {
          currRow += 1
        }
        return withLocation
      })
      maxRowUsedInComponent = Math.max(currRow, maxRowUsedInComponent)

      if (newLayerOrdered.length > 3) {
        currColumn += 2
      } else {
        currColumn += 1
      }

      sortedHeightOrderedNodes.push(withLocations)
    })
    maxRowUsed = maxRowUsedInComponent + 1
    withFinalLocations.push(..._.flatten(sortedHeightOrderedNodes))
  })
  return {withFinalLocations, maxRowUsed}
}

export class FactGraph extends Component {
  itemsAndEdges() {
    const {facts, spaces} = this.props

    let factNodes = _.map(facts, makeFactNodeFn(spaces))

    const spacesToDisplay = _.filter(spaces, s => s.exported_facts_count > 0 || !_.isEmpty(s.imported_fact_ids))
    const spaceNodes = _.map(spacesToDisplay, makeSpaceNodeFn(facts))

    // Here we remove some facts from the set of fact nodes, to display them separately, outside the rest of the graph.
    // In particular, we remove facts that are isolated (i.e. have no inputs or outputs) and orphaned facts, which are
    // facts that are missing inputs, due to missing deletions or other abnormal data setups. We don't want to
    // render those facts within the main graph, as they have no sensible edges we could display, so we pull them out to
    // render with the isolated nodes at the bottom of the graph.
    const isolatedFactNodes = _.remove(factNodes, n => _.isEmpty(n.outputs) && _.isEmpty(n.inputs))

    const nodes = [...factNodes, ...spaceNodes]
    const nodeAncestors = getNodeAncestors(nodes)

    const components = separateIntoDisconnectedComponents(nodes, nodeAncestors)
    const componentsHeightOrdered = _.map(components, separateIntoHeightSets)

    const {withFinalLocations, maxRowUsed} = addLocationsToHeightOrderedComponents(componentsHeightOrdered)

    // Now we add locations to the isolated facts.
    const width = Math.floor(Math.sqrt(isolatedFactNodes.length))
    const isolatedFactNodesWithLocations = _.map(isolatedFactNodes, (n, i) => ({
      ...n,
      location: {row: maxRowUsed + 1 +  Math.floor(i/width), column: i % width},
    }))

    const items = [...isolatedFactNodesWithLocations, ...withFinalLocations]

    const locationById = id => _collections.gget(items, id, 'id', 'location')

    let edges = []
    const pathStatus = 'default'
    factNodes.forEach(({id, outputs, inputs})  => {
      edges.push(...outputs.map(c => ({input: locationById(id), inputId: id, output: locationById(c), outputId: c, pathStatus})))
      edges.push(...inputs.map(p => ({input: locationById(p), inputId: p, output: locationById(id), outputId: id, pathStatus})))
    })

    const bad_edges = _.remove(edges, edge => !_utils.allPropsPresent(edge, 'input.row', 'input.column', 'output.row', 'output.column'))
    if (!_.isEmpty(bad_edges)) {
      console.warn(bad_edges.length, 'BAD EDGES ENCOUNTERED!')
      console.warn(bad_edges)
    }

    return { items, edges }
  }

  render() {
    let {items, edges} = this.itemsAndEdges()

    return (
      <div
        className='FactGraph'
      >
        <FlowGrid
          items={items}
          onMultipleSelect={() => {}}
          hasItemUpdated = {() => false}
          isItemEmpty = {() => false}
          edges={edges}
          selectedRegion={[]}
          copiedRegion={[]}
          selectedCell={{}}
          analyzedRegion={[]}
          onUndo={() => {}}
          onRedo={() => {}}
          onSelectItem={() => {}}
          onDeSelectAll={() => {}}
          onAutoFillRegion={() => {}}
          onAddItem={() => {}}
          onMoveItem={() => {}}
          onRemoveItems={() => {}}
          onCopy={() => {}}
          onPaste={() => {}}
          onCut={() => {}}
          showGridLines={false}
          canvasState={{}}
          isModelingCanvas={false}
        />
      </div>
    )
  }
}
