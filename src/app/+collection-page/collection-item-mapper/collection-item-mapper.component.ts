import { combineLatest as observableCombineLatest, Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { fadeIn, fadeInOut } from '../../shared/animations/fade';
import { ActivatedRoute, Router } from '@angular/router';
import { RemoteData } from '../../core/data/remote-data';
import { Collection } from '../../core/shared/collection.model';
import { SearchConfigurationService } from '../../+search-page/search-service/search-configuration.service';
import { PaginatedSearchOptions } from '../../+search-page/paginated-search-options.model';
import { PaginatedList } from '../../core/data/paginated-list';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { getSucceededRemoteData, toDSpaceObjectListRD } from '../../core/shared/operators';
import { SearchService } from '../../+search-page/search-service/search.service';
import { DSpaceObject } from '../../core/shared/dspace-object.model';
import { DSpaceObjectType } from '../../core/shared/dspace-object-type.model';
import { SortDirection, SortOptions } from '../../core/cache/models/sort-options.model';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { ItemDataService } from '../../core/data/item-data.service';
import { TranslateService } from '@ngx-translate/core';
import { CollectionDataService } from '../../core/data/collection-data.service';
import { isNotEmpty } from '../../shared/empty.util';
import { RestResponse } from '../../core/cache/response.models';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Actions, ofType } from '@ngrx/effects';
import { IndexActionTypes } from '../../core/index/index.actions';
import { RequestActionTypes } from '../../core/data/request.actions';

@Component({
  selector: 'ds-collection-item-mapper',
  styleUrls: ['./collection-item-mapper.component.scss'],
  templateUrl: './collection-item-mapper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeIn,
    fadeInOut
  ]
})
/**
 * Collection used to map items to a collection
 */
export class CollectionItemMapperComponent implements OnInit {

  /**
   * The collection to map items to
   */
  collectionRD$: Observable<RemoteData<Collection>>;

  /**
   * Search options
   */
  searchOptions$: Observable<PaginatedSearchOptions>;

  /**
   * List of items to show under the "Browse" tab
   * Items inside the collection
   */
  collectionItemsRD$: Observable<RemoteData<PaginatedList<DSpaceObject>>>;

  /**
   * List of items to show under the "Map" tab
   * Items outside the collection
   */
  mappingItemsRD$: Observable<RemoteData<PaginatedList<DSpaceObject>>>;

  /**
   * Sort on title ASC by default
   * @type {SortOptions}
   */
  defaultSortOptions: SortOptions = new SortOptions('dc.title', SortDirection.ASC);

  shouldUpdate$: BehaviorSubject<boolean>;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private searchConfigService: SearchConfigurationService,
              private searchService: SearchService,
              private notificationsService: NotificationsService,
              private itemDataService: ItemDataService,
              private collectionDataService: CollectionDataService,
              private translateService: TranslateService) {
  }

  ngOnInit(): void {
    this.collectionRD$ = this.route.data.pipe(map((data) => data.collection)).pipe(getSucceededRemoteData()) as Observable<RemoteData<Collection>>;
    this.searchOptions$ = this.searchConfigService.paginatedSearchOptions;
    this.loadItemLists();
  }

  /**
   * Load collectionItemsRD$ with a fixed scope to only obtain the items this collection owns
   * Load mappingItemsRD$ to only obtain items this collection doesn't own
   *  TODO: When the API support it, fetch items excluding the collection's scope (currently fetches all items)
   */
  loadItemLists() {
    this.shouldUpdate$ = new BehaviorSubject<boolean>(true);
    const collectionAndOptions$ = observableCombineLatest(
      this.collectionRD$,
      this.searchOptions$,
      this.shouldUpdate$
    );
    this.collectionItemsRD$ = collectionAndOptions$.pipe(
      switchMap(([collectionRD, options, shouldUpdate]) => {
        if (shouldUpdate) {
          return this.collectionDataService.getMappedItems(collectionRD.payload.id, Object.assign(options, {
            sort: this.defaultSortOptions
          }))
        }
      })
    );
    this.mappingItemsRD$ = collectionAndOptions$.pipe(
      switchMap(([collectionRD, options, shouldUpdate]) => {
          if (shouldUpdate) {
            return this.searchService.search(Object.assign(new PaginatedSearchOptions(options), {
              query: this.buildQuery(collectionRD.payload.id, options.query),
              scope: undefined,
              dsoType: DSpaceObjectType.ITEM,
              sort: this.defaultSortOptions
            }));
          }
      }),
      toDSpaceObjectListRD()
    );
  }

  /**
   * Map/Unmap the selected items to the collection and display notifications
   * @param ids         The list of item UUID's to map/unmap to the collection
   * @param remove      Whether or not it's supposed to remove mappings
   */
  mapItems(ids: string[], remove?: boolean) {
    const responses$ = this.collectionRD$.pipe(
      getSucceededRemoteData(),
      map((collectionRD: RemoteData<Collection>) => collectionRD.payload.id),
      switchMap((collectionId: string) =>
        observableCombineLatest(ids.map((id: string) =>
          remove ? this.itemDataService.removeMappingFromCollection(id, collectionId) : this.itemDataService.mapToCollection(id, collectionId)
        ))
      )
    );

    const messageInsertion = remove ? 'unmap' : 'map';

    responses$.subscribe((responses: RestResponse[]) => {
      const successful = responses.filter((response: RestResponse) => response.isSuccessful);
      const unsuccessful = responses.filter((response: RestResponse) => !response.isSuccessful);
      if (successful.length > 0) {
        const successMessages = observableCombineLatest(
          this.translateService.get(`collection.item-mapper.notifications.${messageInsertion}.success.head`),
          this.translateService.get(`collection.item-mapper.notifications.${messageInsertion}.success.content`, { amount: successful.length })
        );

        successMessages.subscribe(([head, content]) => {
          this.notificationsService.success(head, content);
        });
      }
      if (unsuccessful.length > 0) {
        const unsuccessMessages = observableCombineLatest(
          this.translateService.get(`collection.item-mapper.notifications.${messageInsertion}.error.head`),
          this.translateService.get(`collection.item-mapper.notifications.${messageInsertion}.error.content`, { amount: unsuccessful.length })
        );

        unsuccessMessages.subscribe(([head, content]) => {
          this.notificationsService.error(head, content);
        });
      }
      this.shouldUpdate$.next(true);
    });

    this.collectionRD$.pipe(take(1)).subscribe((collectionRD: RemoteData<Collection>) => {
      this.collectionDataService.clearMappingItemsRequests(collectionRD.payload.id);
      this.searchService.clearDiscoveryRequests();
    });
  }

  /**
   * Clear url parameters on tab change (temporary fix until pagination is improved)
   * @param event
   */
  tabChange(event) {
    // TODO: Fix tabs to maintain their own pagination options (once the current pagination system is improved)
    // Temporary solution: Clear url params when changing tabs
    this.router.navigateByUrl(this.getCurrentUrl());
  }

  /**
   * Get current url without parameters
   * @returns {string}
   */
  getCurrentUrl(): string {
    if (this.router.url.indexOf('?') > -1) {
      return this.router.url.substring(0, this.router.url.indexOf('?'));
    }
    return this.router.url;
  }

  /**
   * Build a query where items that are already mapped to a collection are excluded from
   * @param collectionId    The collection's UUID
   * @param query           The query to add to it
   */
  buildQuery(collectionId: string, query: string): string {
    const excludeColQuery = `-location.coll:\"${collectionId}\"`;
    if (isNotEmpty(query)) {
      return `${excludeColQuery} AND ${query}`;
    } else {
      return excludeColQuery;
    }
  }

}
