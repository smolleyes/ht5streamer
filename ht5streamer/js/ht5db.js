//~ Copyright (C) Laguillaumie sylvain
//
//~ This program is free software; you can redistribute it and/or
//~ modify it under the terms of the GNU General Public License
//~ as published by the Free Software Foundation; either version 2
//~ of the License, or (at your option) any later version.
//~ 
//~ This program is distributed in the hope that it will be useful,
//~ but WITHOUT ANY WARRANTY; without even the implied warranty of
//~ MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//~ GNU General Public License for more details.
//~ 
//~ You should have received a copy of the GNU General Public License
//~ along with this program; if not, write to the Free Software
//~ Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

$(document).ready(function() {
	
// load/create db
bongo.db({
  name: 'ht5',
  collections: ["videos"]
});


});

function insertToDb(title,vid,flink,engine) {
	bongo.db('ht5').collection('videos').insert({
	  title : title,
	  vid: vid,
	  flink: flink,
	  engine: engine
	},function(error,id) {
	  if(!error) {
		console.log(title + ' inserted successfully in database');
		getAllItems(function(results) { showItems(results); });
	  }
	});
}

function findInDb(title) {
	bongo.db('ht5').collection('videos').find({
		title: title
	}).toArray(function(error,results) {
		if(!error) {
			console.log(results);
		} else {
			console.log(error);
		}
	});
}

function removeFromDb(id) {
	bongo.db('ht5').collection('videos').remove(id, function(error, data) {
		if(!error) {
			console.log('id: '+id+', successfully removed from db');
			getAllItems(function(results) { showItems(results); });
		}
	});
}

function getAllItems(cb) {
	bongo.db('ht5').collection('videos').find({}).toArray(function(error,results) {
        if(!error) {
			cb(results);
        }
    });
}
