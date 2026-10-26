import { inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map } from 'rxjs';

export function relocationId(): Signal<string | undefined> {
  const route = inject(ActivatedRoute);
  return toSignal(
    combineLatest(route.pathFromRoot.map((segment) => segment.paramMap)).pipe(
      map((params) => {
        for (let index = params.length - 1; index >= 0; index -= 1) {
          const id = params[index].get('id');
          if (id) {
            return id;
          }
        }

        return undefined;
      }),
    ),
  );
}
