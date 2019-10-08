import React from 'react';
import GGEditor, { Flow, withPropsAPI } from 'gg-editor';
import dagre from 'dagre';
import Layout from './layout';
import styles from './index.module.css';

GGEditor.setTrackable(false);

const _graph = {
  fitView: 'tc',
  fitViewPadding: [20, 40, 40, 20]
};

const isDuplicateEdge = item => {
  return (
    item.type === 'edge' &&
    Object.values(item.dataMap).filter(
      o => o.source === item.source.id && o.target === item.target.id
    ).length > 1
  );
};

const resetAnchor = (nodes, edge) => {
  if (!nodes || !nodes.length) return [0, 0];
  let sourceAnchor = 0;
  let targetAnchor = 0;
  const targetNode = nodes.find(n => n.id === edge.target);
  const sourceNode = nodes.find(n => n.id === edge.source);

  if (targetNode.y - sourceNode.y <= 100) {
    if (targetNode.x <= sourceNode.x) {
      sourceAnchor = 3;
      targetAnchor = 1;
    } else {
      sourceAnchor = 1;
      targetAnchor = 3;
    }
  } else {
    if (targetNode.y <= sourceNode.y) {
      sourceAnchor = 0;
      targetAnchor = 2;
    } else {
      sourceAnchor = 2;
      targetAnchor = 0;
    }
  }
  return [sourceAnchor, targetAnchor];
};

class FlowPage extends React.Component {
  onAfterChange = ({ action, affectedItemIds, item }) => {
    const { save } = this.editor.propsAPI;

    if (action === 'add' && isDuplicateEdge(item)) {
      return;
    }
    sessionStorage['graph_data'] = JSON.stringify(save());
  };

  getData = () => {
    return sessionStorage['graph_data']
      ? JSON.parse(sessionStorage['graph_data'])
      : { nodes: [], edges: [] };
  };

  handleLayout = () => {
    const { read } = this.editor.propsAPI;
    let data = this.getData();
    data = { nodes: data.nodes || [], edges: data.edges || [] };
    const graph = new dagre.graphlib.Graph()
      .setGraph({})
      .setDefaultEdgeLabel(() => {
        return {};
      });
    data.nodes.forEach(node => {
      const size = (node.size || '100*100').split('*');
      const width = Number(size[0]);
      const height = Number(size[1]);
      graph.setNode(node.id, { width, height });
    });
    data.edges.forEach(edge => {
      graph.setEdge(edge.source, edge.target);
    });
    dagre.layout(graph);
    const nextNodes = data.nodes.map(node => {
      const graphNode = graph.node(node.id);
      return { ...node, x: graphNode.x, y: graphNode.y };
    });
    const nextEdges = data.edges.map(edge => {
      const [sourceAnchor, targetAnchor] = resetAnchor(nextNodes, edge);
      return { ...edge, sourceAnchor, targetAnchor };
    });
    read({ nodes: nextNodes, edges: nextEdges });
  };

  componentDidMount() {
    this.handleLayout();
  }

  render() {
    return (
      <Layout setEditor={el => (this.editor = el)}>
        <Flow
          onAfterChange={this.onAfterChange}
          grid={'line'}
          className={styles.flow}
          graph={_graph}
          data={this.getData()}
          noEndEdge={false}
        />
      </Layout>
    );
  }
}

export default withPropsAPI(FlowPage);
