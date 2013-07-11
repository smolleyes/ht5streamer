#!/usr/bin/env python

import sys, os
from stat import *
from setuptools import find_packages
from distutils.core import setup
from distutils.command.install import install as _install

try:
    from DistUtilsExtra.command import *
except ImportError:
    print 'Cannot install ht5streamer :('
    print 'Would you please install package "python-distutils-extra and python-setuptools" first?'
    sys.exit()
import glob

INSTALLED_FILES = '.installed_files'

#stolen from ccsm
class install (_install):

	def run (self):

		_install.run(self)
		outputs = self.get_outputs()
		data = '\n'.join(outputs)
		try:
			f = open(INSTALLED_FILES, 'w')
		except:
			self.warn ('Could not write installed files list %s' %INSTALLED_FILES)
			return 

		f.write(data)
		f.close()

class uninstall(_install):

	def run(self):
		try:
			files = file(INSTALLED_FILES, 'r').readlines()
		except:
			self.warn('Could not read installed files list %s' %INSTALLED_FILES)
			return

		for f in files:
			print 'Uninstalling %s' %f.strip()
			try:
				os.unlink(f.strip())
			except:
				self.warn('Could not remove file %s' %f)
		os.remove(INSTALLED_FILES)

version = open('VERSION', 'r').read().strip()	

data_files = [
	('bin',['ht5streamer','nw.pak','libffmpegsumo.so']),
	('share/icons/hicolor/24x24/apps',['setup-images/24x24/ht5streamer.png']),
	('share/icons/hicolor/48x48/apps',['setup-images/48x48/ht5streamer.png']),
	('share/applications',['ht5streamer.desktop']),
]


setup(
	name='ht5streamer',
	version=version,
	description='Desktop streaming for youtube and dailymotion',
	author='Laguillaumie sylvain',
	author_email='s.lagui@free.fr',
	url='http://forum.ubuntu-fr.org/viewtopic.php?id=1299461',
	data_files=data_files,
	cmdclass={'build' :  build_extra.build_extra,
	    'build_help' :  build_help.build_help,
	    'build_icons' :  build_icons.build_icons,
	    'uninstall': uninstall,
	    'install': install,
	    },
)

#Stolen from ccsm's setup.py
if sys.argv[1] == 'install':
	
	prefix = "/usr"

	if len (sys.argv) > 2:
		i = 0
		for o in sys.argv:
			if o.startswith ("--prefix"):
				if o == "--prefix":
					if len (sys.argv) >= i:
						prefix = sys.argv[i + 1]
					sys.argv.remove (prefix)
				elif o.startswith ("--prefix=") and len (o[9:]):
					prefix = o[9:]
				sys.argv.remove (o)
				break
			i += 1

	if not prefix:
		prefix = '/usr/local'
	gtk_update_icon_cache = '''gtk-update-icon-cache -f -t \
%s/share/icons/hicolor''' % prefix
	root_specified = [s for s in sys.argv if s.startswith('--root')]
	if not root_specified or root_specified[0] == '--root=/':
		print 'Updating Gtk icon cache.'
		os.system(gtk_update_icon_cache)
	else:
		print '''*** Icon cache not updated. After install, run this:
***     %s''' % gtk_update_icon_cache
        os.system('xdg-desktop-menu install --novendor ht5streamer.desktop')

