import gulp from 'gulp';
import babel from 'gulp-babel';
import sourcemaps from 'gulp-sourcemaps';

gulp.task('build:js', () => {
  return gulp.src('./src/index.js')
  .pipe(sourcemaps.init())
  .pipe(babel({ presets: ['es2015', 'stage-0', 'stage-1'], plugins: ['transform-class-properties'], compact: true }))
  .pipe(gulp.dest('./lib'));
});

gulp.task('default', gulp.parallel('build:js'));

