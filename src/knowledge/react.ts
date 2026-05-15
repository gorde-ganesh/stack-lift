import type { UpgradeStep } from '../types/index.js';

const REACT_STEPS: Record<string, UpgradeStep> = {
  '16-17': {
    fromVersion: '16',
    toVersion: '17',
    description: 'React 17: No new features, new JSX transform, event delegation changes',
    breakingChanges: [
      {
        api: 'React import for JSX',
        description: 'New JSX transform no longer requires "import React from react" in every file',
        before: "import React from 'react';\nconst el = <div />;",
        after: '// No React import needed for JSX\nconst el = <div />;',
        automated: true,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'import',
        searchPattern: "import React from 'react'",
      },
      {
        api: 'Synthetic event pooling',
        description: 'Event pooling removed — no need to call e.persist()',
        before: 'e.persist(); setTimeout(() => console.log(e.target.value));',
        after: 'setTimeout(() => console.log(e.target.value)); // e.persist() not needed',
        automated: false,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'behavior',
        searchPattern: 'e.persist()',
      },
      {
        api: 'Event delegation target',
        description:
          'Events now delegate to the React root instead of document — affects manual addEventListener on document',
        automated: false,
        severity: 'medium',
        fromVersion: '16',
        toVersion: '17',
        category: 'behavior',
      },
      {
        api: 'onScroll event bubbling',
        description: 'onScroll no longer bubbles in React (matches browser behavior)',
        automated: false,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'behavior',
      },
    ],
    automatedFixes: 1,
    manualActions: [
      'Update react and react-dom: npm install react@17 react-dom@17',
      'Update @types/react and @types/react-dom if using TypeScript',
      'Set jsxRuntime: "automatic" in tsconfig (jsx: "react-jsx") or Babel config',
      'Remove e.persist() calls where present',
    ],
    npmInstall: ['react@17', 'react-dom@17'],
  },

  '17-18': {
    fromVersion: '17',
    toVersion: '18',
    description: 'React 18: Concurrent rendering, createRoot, automatic batching, Suspense SSR',
    breakingChanges: [
      {
        api: 'ReactDOM.render',
        description: 'ReactDOM.render is deprecated. Replace with createRoot().render()',
        before:
          "import ReactDOM from 'react-dom';\nReactDOM.render(<App />, document.getElementById('root'));",
        after:
          "import { createRoot } from 'react-dom/client';\ncreateRoot(document.getElementById('root')!).render(<App />);",
        automated: true,
        severity: 'high',
        fromVersion: '17',
        toVersion: '18',
        category: 'api',
        searchPattern: 'ReactDOM.render(',
      },
      {
        api: 'ReactDOM.hydrate',
        description: 'ReactDOM.hydrate deprecated. Replace with hydrateRoot()',
        before: 'ReactDOM.hydrate(<App />, container);',
        after: "import { hydrateRoot } from 'react-dom/client';\nhydrateRoot(container, <App />);",
        automated: true,
        severity: 'high',
        fromVersion: '17',
        toVersion: '18',
        category: 'api',
        searchPattern: 'ReactDOM.hydrate(',
      },
      {
        api: 'Automatic batching',
        description:
          'State updates inside async callbacks are now batched — may affect tests expecting immediate re-renders',
        automated: false,
        severity: 'medium',
        fromVersion: '17',
        toVersion: '18',
        category: 'behavior',
      },
      {
        api: 'StrictMode double-invoke effects',
        description:
          'StrictMode now mounts/unmounts/mounts components to detect effect cleanup issues',
        automated: false,
        severity: 'medium',
        fromVersion: '17',
        toVersion: '18',
        category: 'behavior',
      },
      {
        api: 'renderToString Suspense support',
        description:
          'renderToString now supports Suspense; previously unsupported Suspense boundaries threw',
        automated: false,
        severity: 'low',
        fromVersion: '17',
        toVersion: '18',
        category: 'behavior',
      },
      {
        api: 'unmountComponentAtNode',
        description:
          'unmountComponentAtNode deprecated. Use root.unmount() on the createRoot instance',
        before: 'ReactDOM.unmountComponentAtNode(container);',
        after: 'root.unmount(); // where root = createRoot(container)',
        automated: false,
        severity: 'medium',
        fromVersion: '17',
        toVersion: '18',
        category: 'api',
        searchPattern: 'unmountComponentAtNode(',
      },
    ],
    automatedFixes: 2,
    manualActions: [
      'Install: npm install react@18 react-dom@18',
      'Install: npm install -D @types/react@18 @types/react-dom@18',
      'Replace ReactDOM.render with createRoot().render()',
      'Replace ReactDOM.hydrate with hydrateRoot()',
      'Wrap app tests with act() where needed after batching changes',
      "Use flushSync() from 'react-dom' to opt out of automatic batching where needed",
    ],
    npmInstall: ['react@18', 'react-dom@18'],
  },

  '18-19': {
    fromVersion: '18',
    toVersion: '19',
    description:
      'React 19: Actions, use() hook, ref as prop, improved error handling, asset loading',
    breakingChanges: [
      {
        api: 'forwardRef',
        description:
          'forwardRef is deprecated — ref is now a regular prop. Remove forwardRef wrapper.',
        before:
          'const Comp = forwardRef<HTMLDivElement, Props>((props, ref) => <div ref={ref} {...props} />);',
        after:
          'const Comp = ({ ref, ...props }: Props & { ref?: Ref<HTMLDivElement> }) => <div ref={ref} {...props} />;',
        automated: false,
        severity: 'medium',
        fromVersion: '18',
        toVersion: '19',
        category: 'api',
        searchPattern: 'forwardRef(',
      },
      {
        api: 'propTypes and defaultProps on function components',
        description: 'propTypes and defaultProps on function components are removed',
        before:
          'MyComp.propTypes = { name: PropTypes.string };\nMyComp.defaultProps = { name: "world" };',
        after:
          '// Use TypeScript types and default parameters instead\nfunction MyComp({ name = "world" }: { name?: string }) {}',
        automated: false,
        severity: 'high',
        fromVersion: '18',
        toVersion: '19',
        category: 'api',
        searchPattern: '.propTypes =',
      },
      {
        api: 'string refs',
        description: 'String refs are removed — use useRef() or callback refs',
        before: "<input ref='myInput' />",
        after: 'const ref = useRef(null);\n<input ref={ref} />',
        automated: false,
        severity: 'high',
        fromVersion: '18',
        toVersion: '19',
        category: 'api',
        searchPattern: "ref='",
      },
      {
        api: 'ReactDOM.findDOMNode',
        description: 'ReactDOM.findDOMNode is removed — use ref directly',
        before: 'ReactDOM.findDOMNode(this)',
        after: 'this.ref.current // attach ref to the element',
        automated: false,
        severity: 'high',
        fromVersion: '18',
        toVersion: '19',
        category: 'api',
        searchPattern: 'findDOMNode(',
      },
      {
        api: 'Context.Consumer',
        description: 'Context.Consumer is deprecated — use the useContext() hook',
        before: '<MyContext.Consumer>{value => <span>{value}</span>}</MyContext.Consumer>',
        after: 'const value = useContext(MyContext);\n<span>{value}</span>',
        automated: false,
        severity: 'low',
        fromVersion: '18',
        toVersion: '19',
        category: 'api',
        searchPattern: '.Consumer>',
      },
    ],
    automatedFixes: 0,
    manualActions: [
      'Install: npm install react@19 react-dom@19',
      'Remove prop-types package: npm uninstall prop-types',
      'Replace all propTypes and defaultProps with TypeScript types and default parameters',
      'Replace forwardRef with regular ref prop pattern',
      'Replace string refs with useRef() hooks',
      'Replace ReactDOM.findDOMNode with ref.current',
      'Replace Context.Consumer with useContext()',
    ],
    npmInstall: ['react@19', 'react-dom@19'],
  },
};

export function getReactUpgradeSteps(from: string, to: string): UpgradeStep[] {
  const majorVersionOrder = ['16', '17', '18', '19'];
  const fromMajor = from.split('.')[0] ?? '';
  const toMajor = to.split('.')[0] ?? '';

  const fromIdx = majorVersionOrder.indexOf(fromMajor);
  const toIdx = majorVersionOrder.indexOf(toMajor);

  if (fromIdx === -1 || toIdx === -1) return [];

  const steps: UpgradeStep[] = [];
  for (let i = fromIdx; i < toIdx; i++) {
    const key = `${majorVersionOrder[i]}-${majorVersionOrder[i + 1]}`;
    if (REACT_STEPS[key]) {
      steps.push(REACT_STEPS[key]);
    }
  }
  return steps;
}

export function getReactLatestVersion(): string {
  return '19';
}

export const REACT_SUPPORTED_VERSIONS = ['16', '17', '18', '19'];
