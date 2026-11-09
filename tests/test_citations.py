import copy
import hashlib

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from backend.app import create_app
from backend.store import SourceRef, Store


def test_labels_preserve_legacy_reference_shape():
    old={'source_id':'BOOK','page':1,'locator':'Selected passage'}
    assert SourceRef.model_validate(old).model_dump()==old
    new={**old,'label':'Establishment: support watering'}
    assert SourceRef.model_validate(new).model_dump()==new
    for label in ['', '   ', None, 123, 'x'*241]:
        with pytest.raises(ValueError,match='Citation label'):
            SourceRef.model_validate({**old,'label':label})


def test_checked_page_labels_are_atomic_and_visible_in_catalog(tmp_path):
    source_path=tmp_path/'sources/book.pdf';source_path.parent.mkdir()
    writer=PdfWriter();writer.add_blank_page(width=200,height=200);writer.add_blank_page(width=200,height=200)
    with source_path.open('wb') as file:writer.write(file)
    source={'id':'BOOK','kind':'pdf','title':'Test handbook','filename':'book.pdf','managed_path':'sources/book.pdf',
            'sha256':hashlib.sha256(source_path.read_bytes()).hexdigest(),'pdf_pages':2,'initial_pdf_page_ranges':[[1,2]]}
    store=Store(tmp_path/'knowledge.sqlite',media_root=tmp_path)
    store.import_batch({'batch_id':'initial-source','summary':'Fixture','sources':[source]})
    before=store.snapshot()
    revised={**source,'page_labels':{'1':'Site conditions','2':'Establishment: support watering'}}
    batch={'batch_id':'page-labels','summary':'Checked display metadata','base_revision':store.revision(),'sources':[revised]}
    store.import_batch(batch,True)
    assert store.snapshot()==before
    for labels in [{'0':'Invalid'}, {'01':'Invalid'}, {'3':'Out of bounds'}, {'1':''}, {'1':42}, []]:
        bad=copy.deepcopy(batch);bad['sources'][0]['page_labels']=labels
        with pytest.raises(ValueError,match='page_labels'):store.import_batch(bad)
        assert store.snapshot()==before
    assert store.import_batch(batch)['status']=='accepted'
    assert store.revision()==before['revision']+1
    after=store.snapshot()
    assert after['sources']==[revised]
    for key in before:
        if key not in {'revision','sources'}:assert before[key]==after[key]
    assert TestClient(create_app(store)).get('/api/catalog').json()['sources'][0]['page_labels']==revised['page_labels']
    assert hashlib.sha256(source_path.read_bytes()).hexdigest()==source['sha256']
