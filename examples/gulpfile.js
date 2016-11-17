'use strict'
const fs = require('fs')
const gulp = require('gulp')
const $ = require('gulp-load-plugins')()
const argv = require('yargs').default('env','development').argv
const yaml = require('js-yaml')

const aglex = (() => {
  const aglexConfig = yaml.safeLoad(fs.readFileSync(`aglex-${argv.env}.yml`, 'utf8'))
  return require('aglex')(aglexConfig, 'info')
})()

const sourceFiles = ['src/**/*.js']

gulp.task('serve', () => {
  const server = $.liveServer('src/www.js', {env: {NODE_ENV: argv.env}}, false)
  server.start()
  return gulp.watch(sourceFiles, () => {
    console.log('restart server')
    return server.start.bind(server)()
  })
})

gulp.task('build', () =>
  require('run-sequence')('clean', 'zip')
)

gulp.task('clean', done =>
  require('del')(['build/*', '!build/node_modules', 'dist/*'], done)
)

gulp.task('lint', () =>
  gulp.src(sourceFiles)
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
)

gulp.task('prepareCode', ['lint'], () =>
  gulp.src(sourceFiles)
    .pipe(gulp.dest('build'))
)

gulp.task('prepareConfig', () =>
  gulp.src(`config/${argv.env}.yml`)
    .pipe($.rename('default.yml'))
    .pipe(gulp.dest('build/config'))
)

gulp.task('preparePackages', () =>
  gulp.src(['./package.json', './npm-shrinkwrap.json'])
    .pipe(gulp.dest('build'))
    .pipe($.install({production: true}))
)

gulp.task('zip', ['prepareCode', 'prepareConfig', 'preparePackages'], () =>
  gulp.src('build/**')
    .pipe($.zip('lambda.zip'))
    .pipe(gulp.dest('dist'))
)

gulp.task('updateLambda', ['zip'], () => aglex.updateLambda('dist/lambda.zip'))

gulp.task('addLambdaPermission', () => aglex.addLambdaPermission())

gulp.task('updateApi', () => aglex.updateApi())

gulp.task('deployApi', () => {
  if (!argv.stage) {
    console.log('Please use --stage STAGENAME')
    return
  }
  return aglex.deployApi(argv.desc, argv.stage, argv.stagedesc)
})

gulp.task('listStages', () =>
  aglex.getApiStages().then(stages => {
    for (let stage of stages) {
      console.log(`${stage.stageName}:${stage.description || ''} (${stage.invokeUrl})`)
    }
  })
)
