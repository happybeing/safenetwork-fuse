#!/bin/bash
DRIVE_PATH=~/SAFE/_public/tests/data1
SUCCESS_MESSAGE="ALL TESTS PASSED"

if [ "$1" == "" ]; then
  echo "Usage: $0 [live|mock|disk]"
  echo "Run tests on a mounted SAFE Drive. If no parameters, prints this help."
  echo ""
  echo "Parameters:"
  echo "          live - run tests on a mounted SAFE Drive (see Pre-requisites)"
  echo "          mock - as live, but using 'mock' network (see Pre-requisites)"
  echo "          disk - run tests on your local drive (see Modification)"
  echo ""
  echo "This shell script performs a sequence of operations on a mounted"
  echo "SAFE Drive and compares the results with what is expected."
  echo ""
  echo "In most cases the operations are printed to the terminal, and script"
  echo "execution will stop immediately after the first test which fails. In"
  echo "some tests, an explicit success or failure message is printed instead,"
  echo "in which case the script commands are not printed to the terminal."
  echo ""
  echo "Prints '$SUCCESS_MESSAGE' on successful execution of all tests."
  echo ""
  echo "PRE-REQUISITES:"
  echo "Tests on a mounted SAFE Drive require a container to exist at"
  echo "  '$DRIVE_PATH'"
  echo ""
  echo "You can ensure this exists by setting an environment variable that"
  echo "causes the container to be created by SAFE Drive when you issue the"
  echo "command to mount the drive. To enable this feature of SAFE Drive, use"
  echo "'SAFENETWORKJS_TESTS=testing' in your environment or as part of the"
  echo "mount command. For example:"
  echo ""
  echo "  export SAFENETWORKJS_TESTS=testing"
  echo "  mount-safe"
  echo "or"
  echo "  SAFENETWORKJS_TESTS=testing DEBUG=* node --inspect bin.js"
  echo ""
  echo "MODIFICATION:"
  echo "While making changes to the script, the 'disk' causes the tests to be"
  echo "run on your local hard drive without the need for SAFE Drive to be"
  echo "mounted."
  echo ""
  echo "Ideally structured regression tests will replace this script, see"
  echo "github issue: https://github.com/theWebalyst/safenetwork-fuse/issues/13"
  echo ""
  echo "TODO rework older play-dir tests which were originally for file mirror"
  exit
fi

if [ "$1" == "live" ]; then
  LIVE=true
  echo "Running tests on mounted SAFE Drive (LIVE network)"
fi

if [ "$1" == "mock" ]; then
  LIVE=false
  echo "Running tests on mounted SAFE Drive (MOCK network)"
fi

if [ "$1" == "disk" ]; then
  DRIVE_PATH=~
  echo "Running tests on local drive (not SAFE mount)"
fi

# Sites to list on live network, one safe://service.name and one just safe://name
WEBSITE1=cat.ashi
WEBSITE2=heaven

SAFE_DRIVE_PATH=$DRIVE_PATH/testing-safedrive
SYNCDIR=testing-safedrive-syncdir

echo Using SAFE_DRIVE_PATH = $SAFE_DRIVE_PATH
echo ""

rm -rf tests-safedrive
mkdir tests-safedrive
cd tests-safedrive
rm -rf $SAFE_DRIVE_PATH working-copy
mkdir $SAFE_DRIVE_PATH working-copy $SAFE_DRIVE_PATH/play-dir $SAFE_DRIVE_PATH/del-dir

cleanup() {
  echo clearing test directories...
  rm -rf $SAFE_DRIVE_PATH tests-safedrive working-copy
#    if [ -e "union" ]; then fusermount -u -q union; fi
}
trap cleanup EXIT

# src/unionfs -d -o cow working-copy=rw:original=ro union >unionfs.log 2>&1 &

set +v
echo ""
echo "TESTING: automount of _documents"
if [ -d ~/SAFE/_documents ]; then
  echo "SKIPPED - _documents is already mounted"
else
  [ -d ~/SAFE/_documents ]
  echo "SUCCESS - _documents is now mounted"
fi

if [ "$LIVE" != "true" ]; then
  echo ""
  echo "TESTING: SKIPPED for LIVE network (we're not LIVE)"
fi

if [ "$LIVE" == "true" ]; then
  echo ""
  echo "TESTING: automount of _webMounts"
# TODO re-instate when I change _webMounts to ENOTFOUND before it is mounted
#  if [ -d ~/SAFE/_webMounts ]; then
#    echo "SKIPPED - _webMounts is already mounted"
#  else
#    [ ! -d ~/SAFE/_webMounts ]
    echo ""
    echo "ls ~/SAFE/_webMounts/$WEBSITE1"
    ls ~/SAFE/_webMounts/$WEBSITE1
    echo ""
    echo "ls ~/SAFE/_webMounts/$WEBSITE2"
    ls ~/SAFE/_webMounts/$WEBSITE2
    [ -d ~/SAFE/_webMounts ]
    echo ""
    echo "ls ~/SAFE/_webMounts"
    ls ~/SAFE/_webMounts
    echo ""
    echo "SUCCESS - _webMounts is mounted"
#  fi
fi

echo ""
echo "TESTING: file creation and modification"
echo Making files...
set -e  # Exit on error
set -v  # Echo output
echo v1 > $SAFE_DRIVE_PATH/file
echo v1 > $SAFE_DRIVE_PATH/play-with-me
echo v1 > $SAFE_DRIVE_PATH/delete-me
sleep 1

[ "$(cat $SAFE_DRIVE_PATH/file)" = "v1" ]

echo "v2" > $SAFE_DRIVE_PATH/file
[ "$(cat $SAFE_DRIVE_PATH/file)" = "v2" ]

echo "v2" > $SAFE_DRIVE_PATH/play-with-me
[ "$(cat $SAFE_DRIVE_PATH/play-with-me)" = "v2" ]

[ -f $SAFE_DRIVE_PATH/play-with-me ]
rm $SAFE_DRIVE_PATH/play-with-me
[ ! -f $SAFE_DRIVE_PATH/play-with-me ]

[ -f $SAFE_DRIVE_PATH/delete-me ]
rm $SAFE_DRIVE_PATH/delete-me
[ ! -f $SAFE_DRIVE_PATH/delete-me ]

[ "$(ls $SAFE_DRIVE_PATH/play-dir)" = "" ]
echo "fool" > $SAFE_DRIVE_PATH/play-dir/foo
[ "$(ls $SAFE_DRIVE_PATH/play-dir)" = "foo" ]
rm $SAFE_DRIVE_PATH/play-dir/foo
[ "$(ls $SAFE_DRIVE_PATH/play-dir)" = "" ]

[ -d $SAFE_DRIVE_PATH/play-dir ]
rmdir $SAFE_DRIVE_PATH/play-dir
echo currently failing:
echo '[ ! -d $SAFE_DRIVE_PATH/play-dir ]'

[ -d $SAFE_DRIVE_PATH/del-dir ]
rmdir $SAFE_DRIVE_PATH/del-dir
[ ! -d $SAFE_DRIVE_PATH/del-dir ]

! echo v1 > $SAFE_DRIVE_PATH/del-dir/foo

[ ! -d $SAFE_DRIVE_PATH/del-dir ]
mkdir $SAFE_DRIVE_PATH/del-dir
[ ! -f $SAFE_DRIVE_PATH/del-dir/foo ]
echo v1 > $SAFE_DRIVE_PATH/del-dir/foo
[ -f $SAFE_DRIVE_PATH/del-dir/foo ]
rm $SAFE_DRIVE_PATH/del-dir/foo
echo currently failing:
echo '[ -d $SAFE_DRIVE_PATH/del-dir ]'
rmdir $SAFE_DRIVE_PATH/del-dir
[ ! -d $SAFE_DRIVE_PATH/del-dir ]

set +v
set +e
# rmdir() test
echo ""
echo "TESTING: rmdir"
sleep 1
rc=0
mkdir $SAFE_DRIVE_PATH/testdir
touch $SAFE_DRIVE_PATH/testdir/testfile
mkdir working-copy/testdir
rmdir $SAFE_DRIVE_PATH/testdir 2>/dev/null
if [ $? -eq 0 ]; then
	echo "rmdir succeeded, although it must not"
	rc=$(($rc + $?))
fi
rm $SAFE_DRIVE_PATH/testdir/testfile
rc=$(($rc + $?))
rmdir $SAFE_DRIVE_PATH/testdir/
rc=$(($rc + $?))
if [ $rc -ne 0 ]; then
	echo "rmdir test FAILED"
	exit 1
else
	echo "rmdir test PASSED"
fi
set -e

echo ""
echo "TESTING: git"
sleep 1
mkdir $SAFE_DRIVE_PATH/tests-git
pushd $SAFE_DRIVE_PATH/tests-git
git init --bare
popd
git clone $SAFE_DRIVE_PATH/tests-git
pushd tests-git
echo SAFE Drive test repository > README.md
git add .
git commit -m "Initial commit"
git branch test-branch
git tag test-tag -m "Its just a test"
git push --all

echo ""
echo "TESTING: rsync"
rm -rf $SYNC
# TODO test with '-a' after implementing FUSE utimens()
rsync -r --delete $SAFE_DRIVE_PATH/* $SYNCDIR
echo abcd >$SYNCDIR/blah
# TODO test with '-a' after implementing FUSE utimens()
rsync -r --delete $SYNCDIR/* $SAFE_DRIVE_PATH
diff -r $SAFE_DRIVE_PATH $SYNCDIR

#fusermount -u union

#[ "$(cat $SAFE_DRIVE_PATH/file)" = "v1" ]
#[ "$(cat $SAFE_DRIVE_PATH/play-with-me)" = "v1" ]
#[ "$(cat $SAFE_DRIVE_PATH/delete-me)" = "v1" ]
#[ -d $SAFE_DRIVE_PATH/play-dir ]
#[ -d $SAFE_DRIVE_PATH/del-dir ]
#[ "$(cat working-copy/file)" = "v2" ]

cd ..
echo ""
echo $SUCCESS_MESSAGE
echo ""
echo "RECOMMENDED: re-run immediately to test incorrect caching of deleted data"
