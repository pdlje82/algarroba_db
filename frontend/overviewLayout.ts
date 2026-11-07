import {compactGrid} from './compactLayout.ts';

/** A dense responsive map, with familiar domain columns when three columns fit. */
export function overviewLayout(aspect:number,count=9){
 const grid=compactGrid(count,aspect,264,118);
 return {...grid,points:grid.points.map((_,i)=>grid.points[count===9&&grid.columns===3?i%3*3+Math.floor(i/3):i])};
}
