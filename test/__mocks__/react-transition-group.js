import React from 'react';

const filterTransitionProps = props => {
  const {
    in: inProp, appear, enter, exit, mountOnEnter, unmountOnExit,
    onEnter, onEntering, onEntered, onExit, onExiting, onExited,
    timeout, classNames, addEndListener, nodeRef,
    ...rest
  } = props;
  return rest;
};

export const Transition = React.forwardRef(({children, ...props}, ref) => {
  const child = typeof children === 'function' ? children('entered') : children;
  const filteredProps = filterTransitionProps(props);
  return React.createElement('div', {ref, ...filteredProps}, child);
});

export const CSSTransition = React.forwardRef(({children, in: inProp, ...props}, ref) => {
  if (!inProp) { return null; }
  const child = typeof children === 'function' ? children('entered') : children;
  const filteredProps = filterTransitionProps(props);
  return React.createElement('div', {ref, ...filteredProps}, child);
});

export const TransitionGroup = React.forwardRef(({children, ...props}, ref) => {
  const filteredProps = filterTransitionProps(props);
  return React.createElement('div', {ref, ...filteredProps}, children);
});

export const Fade = React.forwardRef(({children, in: inProp, ...props}, ref) => {
  if (!inProp) { return null; }
  const child = typeof children === 'function' ? children('entered') : children;
  const filteredProps = filterTransitionProps(props);
  return React.createElement('div', {ref, ...filteredProps}, child);
});
