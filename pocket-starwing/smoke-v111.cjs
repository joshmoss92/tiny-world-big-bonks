const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),transform=require('./v10-polish9.js');
class CL{constructor(){this.s=new Set()}add(...v){v.forEach(x=>this.s.add(x))}remove(...v){v.forEach(x=>this.s.delete(x)}contains(v){return this.s.has(v)}}
