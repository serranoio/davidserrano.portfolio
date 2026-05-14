import { createComponent } from '@lit/react';
import React from 'react';
import { HelloWorldElement } from './hello-world';

export const HelloWorld = createComponent({
  tagName: 'hello-world',
  elementClass: HelloWorldElement,
  react: React,
});
