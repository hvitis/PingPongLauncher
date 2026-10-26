"""Reproduce the English 3MF, STL pack, plate inventory, and source hashes.
Run with Python 3 and NumPy. The original files are never modified.
"""
from pathlib import Path
import zipfile,xml.etree.ElementTree as E,json,hashlib,struct,io
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'docs/downloads/launcher-english.3mf'
english_temp=ROOT/'docs/downloads/launcher-english.tmp.3mf'
ns={'c':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02','p':'http://schemas.microsoft.com/3dmanufacturing/production/2015/06'}
names={2:'Hopper',4:'Feed screw',6:'Wheel flange A',8:'Launch support A',10:'Wheel flange B',12:'Bevel gear',14:'Launch support B',16:'Bevel pinion',18:'Launch wheel A',20:'Captive nut knob A',22:'Rear cover',24:'Captive nut knob B',26:'Launch wheel B',28:'Printed knob A',30:'Feed motor mount',32:'Printed knob B',34:'Rear support',36:'Motor mount 1A',38:'Tilt linkage A',40:'Tilt linkage B',42:'Motor mount 1B',44:'Motor mount 2A',46:'Motor mount 2B',48:'Main body half A',50:'Main body half B',52:'Base lid',54:'Base enclosure',56:'Outlet tube - revision pending'}
report=[]; plates=[]
with zipfile.ZipFile(source) as z, zipfile.ZipFile(english_temp,'w',zipfile.ZIP_DEFLATED) as english,zipfile.ZipFile(ROOT/'docs/downloads/launcher-stl-pack.zip','w',zipfile.ZIP_DEFLATED) as pack:
 config=E.fromstring(z.read('Metadata/model_settings.config')); model=E.fromstring(z.read('3D/3dmodel.model'))
 objects={int(o.get('id')):o for o in model.findall('c:resources/c:object',ns)}
 builds={int(b.get('objectid')):b for b in model.findall('c:build/c:item',ns)}
 plate_for={}
 for pl in config.findall('plate'):
  md={m.get('key'):m.get('value') for m in pl.findall('metadata')};ids=[int(next(m.get('value') for m in inst.findall('metadata') if m.get('key')=='object_id')) for inst in pl.findall('model_instance')];pid=int(md['plater_id']);plates.append({'plate':pid,'objects':ids,'names':[names[i] for i in ids]})
  for i in ids:plate_for[i]=pid
 for ob in config.findall('object'):
  oid=int(ob.get('id'))
  for m in ob.findall('.//metadata'):
   if m.get('key')=='name':m.set('value',names[oid])
   if m.get('key')=='source_file':m.set('value','source-model.3mf')
 for f in z.namelist():
  data=z.read(f)
  if f=='Metadata/model_settings.config':data=E.tostring(config,encoding='utf-8',xml_declaration=True)
  english.writestr(f,data)
 for oid,ob in objects.items():
  comp=ob.find('c:components/c:component',ns);path=comp.get('{'+ns['p']+'}path').lstrip('/');r=E.fromstring(z.read(path));mesh=r.find('.//c:mesh',ns)
  v=np.array([[float(p.get(a)) for a in ('x','y','z')] for p in mesh.findall('c:vertices/c:vertex',ns)],dtype=np.float64)
  t=np.array([[int(p.get(a)) for a in ('v1','v2','v3')] for p in mesh.findall('c:triangles/c:triangle',ns)],dtype=np.int32)
  def transform(vertices,s):
   values=np.array([float(x) for x in s.split()]);return vertices@values[:9].reshape(3,3)+values[9:12]
  v=transform(v,comp.get('transform','1 0 0 0 1 0 0 0 1 0 0 0'));v=transform(v,builds[oid].get('transform','1 0 0 0 1 0 0 0 1 0 0 0'));v-=v.min(axis=0)
  edges=np.sort(np.concatenate([t[:,[0,1]],t[:,[1,2]],t[:,[2,0]]]),axis=1);_,counts=np.unique(edges,axis=0,return_counts=True)
  a=v[t[:,0]];b=v[t[:,1]];c=v[t[:,2]];normal=np.cross(b-a,c-a);norm=np.linalg.norm(normal,axis=1);valid=norm>1e-10;normal[valid]/=norm[valid,None]
  dtype=np.dtype([('normal','<f4',3),('vertices','<f4',(3,3)),('attr','<u2')]);facets=np.zeros(len(t),dtype=dtype);facets['normal']=normal;facets['vertices']=v[t]
  filename=f"plate-{plate_for[oid]:02d}/{oid:02d}-{names[oid].lower().replace(' ','-')}.stl"
  pack.writestr(filename,b'English export; millimeters; original plate orientation'.ljust(80,b'\0')+struct.pack('<I',len(t))+facets.tobytes())
  report.append({'id':oid,'name':names[oid],'plate':plate_for[oid],'triangles':len(t),'sizeMm':np.round(v.max(axis=0),3).tolist(),'boundaryEdges':int(np.sum(counts==1)),'nonManifoldEdges':int(np.sum(counts>2)),'degenerateTriangles':int(np.sum(~valid)),'file':filename})
 pack.writestr('README.txt','Units: millimeters. Original plate orientations applied; each object translated to its own minimum XYZ. One copy per source object. All 28 source objects retained. These are geometry exports, not sliced G-code. See print-guide.md for unresolved checks. Names for generic CAD objects are descriptive identifications, not original designer confirmation.\n')
(ROOT/'docs/data/print-inventory.json').write_text(json.dumps({'plates':sorted(plates,key=lambda p:p['plate']),'objects':sorted(report,key=lambda o:o['id']),'limitations':['Edge incidence and degenerate triangle checks only. No wall-thickness, self-intersection, material, balance, fit, or physical validation.','STL files preserve source plate orientation but contain no support painting or slicer profile. Use English 3MF to retain those settings.']},indent=2))
english_temp.replace(source)
print(json.dumps({'objects':len(report),'triangles':sum(o['triangles'] for o in report),'boundaryEdges':sum(o['boundaryEdges'] for o in report),'nonManifoldEdges':sum(o['nonManifoldEdges'] for o in report),'degenerateTriangles':sum(o['degenerateTriangles'] for o in report)},indent=2))
