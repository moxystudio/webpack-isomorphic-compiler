# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="3.1.0"></a>
# [3.1.0](https://github.com/moxystudio/webpack-isomorphic-compiler/compare/v3.0.0...v3.1.0) (2018-03-04)


### Features

* support webpack v4 ([01a238e](https://github.com/moxystudio/webpack-isomorphic-compiler/commit/01a238e))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/moxystudio/webpack-isomorphic-compiler/compare/v2.0.1...v3.0.0) (2018-02-03)


### Features

* allow invalidating a compilation in watch mode ([7c68c41](https://github.com/moxystudio/webpack-isomorphic-compiler/commit/7c68c41))


### BREAKING CHANGES

* `.watch` no longer returns the compiler and now returns a function that, when called, will stop an ongoing compilation and start a new one. It also emits the `invalidate` event.



<a name="2.0.1"></a>
## [2.0.1](https://github.com/moxystudio/webpack-isomorphic-compiler/compare/v2.0.0...v2.0.1) (2018-01-14)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/moxystudio/webpack-isomorphic-compiler/compare/v1.1.4...v2.0.0) (2017-12-18)


### Chores

* 100% api compatibility with webpack-sane-compiler ([7ff8e9d](https://github.com/moxystudio/webpack-isomorphic-compiler/commit/7ff8e9d))


### BREAKING CHANGES

* several API breaking changes, please check the documentation



<a name="1.1.4"></a>
## [1.1.4](https://github.com/moxystudio/webpack-isomorphic-compiler/compare/v1.1.3...v1.1.4) (2017-11-16)


### Bug Fixes

* fix separator char on windows ([06d8314](https://github.com/moxystudio/webpack-isomorphic-compiler/commit/06d8314))
