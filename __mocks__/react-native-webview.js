const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef(function WebView(props, ref) {
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: jest.fn(),
  }));
  return React.createElement(View, props, props.children);
});

module.exports = { WebView };
