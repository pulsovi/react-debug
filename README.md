# Welcome to @pulsovi/react-debug 👋
[![Version](https://img.shields.io/npm/v/@pulsovi/react-debug.svg)](https://www.npmjs.com/package/@pulsovi/react-debug)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

> provide a hook to debug why and how a component is rerendered

## Install

```sh
npm install @pulsovi/react-debug
```

## Usage

Simplest usage for function component with some states.

```jsx
import React, { useState } from 'react';
import useDebug from '@pulsovi/react-debug';

export default function SomeComponentToDebug(props) {
  const [data, setData] = useState([]);
  const [title, setTitle] = useState('empty');

  useDebug({ props, state: { data, title }});

  // ... your code

  return <div>
    <h1>{title}</h1>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>;
}
```

useDebug can get second parameter for more infos such in elem of list.

```jsx
import React, { useState } from 'react';
import useDebug from '@pulsovi/react-debug';

export default function SomeComponentToDebug(props) {
  const [value, setValue] = useState(null);

  useDebug({ props, state: { value }}, props.title);

  // ... your code

  return <div>
    <h1>{props.title}</h1>
    <p>{value}</p>
    <aside>{props.details}</aside>
  </div>;
}
```

It can also be used in class components more easily.

```jsx
import React from 'react';
import { debug } from '@pulsovi/react-debug';

class SomeComponentToDebug extends React.Component {
  constructor(props) {
    super(props);
    this.state = { clicked: false };
  }

  render() {
    debug(this, this.props.title);

    // ... your code

    return <div>
        <h1>{this.props.title}</h1>
        <p
          onClick={() => { this.setState({ clicked: true }); }}
        >{this.state.clicked ? 'Click me, please.' : 'Bravo !'}</p>
    </div>;
  }
}
export default SomeComponentToDebug;
```

## Author

👤 **David GABISON <david.gabison@outlook.com>**

* Github: [@pulsovi](https://github.com/pulsovi)

## Show your support

Give a ⭐️ if this project helped you!
